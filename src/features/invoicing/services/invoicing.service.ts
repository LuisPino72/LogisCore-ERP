import { db, Invoice, InvoiceItem, TaxpayerInfo, InvoiceSettings } from '@/lib/db';
import { SyncEngine } from '@/lib/sync/SyncEngine';
import { useTenantStore } from '@/store/useTenantStore';
import { Ok, Err, Result, ValidationError, AppError } from '@/lib/types/result';
import { logger, logCategories } from '@/lib/logger';
import { EventBus, Events } from '@/lib/events/EventBus';
import { getExchangeRate } from '@/features/exchange-rate/services/exchangeRate.service';
import * as movementsService from '@/features/accounting/services/movements.service';
import {
  CreateInvoiceInput,
  CreateInvoiceItemInput,
  InvoiceTotals,
  NumerationResult,
  InvoiceFilters,
  IGTF_PERCENTAGE,
  IVA_PERCENTAGES,
} from '../types/invoicing.types';

function getCurrentTenantSlug(): string {
  const { currentTenant } = useTenantStore.getState();
  if (!currentTenant) {
    throw new AppError('No hay tenant activo', 'NO_TENANT', 400);
  }
  return currentTenant.slug;
}

function getCurrentTenantUuid(): string {
  const { currentTenant } = useTenantStore.getState();
  if (!currentTenant) {
    throw new AppError('No hay tenant activo', 'NO_TENANT', 400);
  }
  return currentTenant.id;
}

export async function getTaxpayerInfo(): Promise<Result<TaxpayerInfo | null, AppError>> {
  try {
    const tenantSlug = getCurrentTenantSlug();
    const info = await db.taxpayerInfo.where('tenantId').equals(tenantSlug).first();
    return Ok(info || null);
  } catch (error) {
    logger.error('Error getting taxpayer info', error instanceof Error ? error : undefined, {
      category: logCategories.SALES,
    });
    return Err(new AppError('Error al obtener datos fiscales', 'GET_TAXPAYER_ERROR', 500));
  }
}

export async function saveTaxpayerInfo(data: Omit<TaxpayerInfo, 'id' | 'syncedAt'>): Promise<Result<string, AppError>> {
  try {
    const tenantSlug = getCurrentTenantSlug();
    const existing = await db.taxpayerInfo.where('tenantId').equals(tenantSlug).first();

    const taxpayerInfo: TaxpayerInfo = {
      ...data,
      tenantId: tenantSlug,
      ...(existing ? { id: existing.id } : {}),
    };

    if (existing) {
      await db.taxpayerInfo.put(taxpayerInfo);
    } else {
      await db.taxpayerInfo.add(taxpayerInfo);
    }

    await SyncEngine.addToQueue(
      'taxpayer_info',
      existing ? 'update' : 'create',
      taxpayerInfo as unknown as Record<string, unknown>,
      data.localId
    );

    return Ok(data.localId);
  } catch (error) {
    logger.error('Error saving taxpayer info', error instanceof Error ? error : undefined, {
      category: logCategories.SALES,
    });
    return Err(new AppError('Error al guardar datos fiscales', 'SAVE_TAXPAYER_ERROR', 500));
  }
}

export async function getInvoiceSettings(): Promise<Result<InvoiceSettings | null, AppError>> {
  try {
    const tenantSlug = getCurrentTenantSlug();
    const settings = await db.invoiceSettings.where('tenantId').equals(tenantSlug).first();
    return Ok(settings || null);
  } catch (error) {
    logger.error('Error getting invoice settings', error instanceof Error ? error : undefined, {
      category: logCategories.SALES,
    });
    return Err(new AppError('Error al obtener configuración', 'GET_SETTINGS_ERROR', 500));
  }
}

export async function saveInvoiceSettings(
  data: Partial<Omit<InvoiceSettings, 'id' | 'syncedAt'>>
): Promise<Result<string, AppError>> {
  try {
    const tenantSlug = getCurrentTenantSlug();
    const existing = await db.invoiceSettings.where('tenantId').equals(tenantSlug).first();

    const localId = existing?.localId || crypto.randomUUID();

    const settings: InvoiceSettings = {
      localId,
      tenantId: tenantSlug,
      sequentialType: existing?.sequentialType || 'daily',
      lastInvoiceNumber: existing?.lastInvoiceNumber || 0,
      lastControlPrefix: existing?.lastControlPrefix || '',
      lastInvoiceDate: existing?.lastInvoiceDate,
      igtfEnabled: existing?.igtfEnabled ?? true,
      igtfPercentage: existing?.igtfPercentage || IGTF_PERCENTAGE,
      ...data,
    };

    if (existing) {
      await db.invoiceSettings.put(settings);
    } else {
      await db.invoiceSettings.add(settings);
    }

    await SyncEngine.addToQueue(
      'invoice_settings',
      existing ? 'update' : 'create',
      settings as unknown as Record<string, unknown>,
      localId
    );

    return Ok(localId);
  } catch (error) {
    logger.error('Error saving invoice settings', error instanceof Error ? error : undefined, {
      category: logCategories.SALES,
    });
    return Err(new AppError('Error al guardar configuración', 'SAVE_SETTINGS_ERROR', 500));
  }
}

export async function getNextInvoiceNumber(maxRetries = 3): Promise<Result<NumerationResult, AppError>> {
  const retryGetNumber = async (attempt: number): Promise<Result<NumerationResult, AppError>> => {
    try {
      const tenantSlug = getCurrentTenantSlug();
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = today.substring(0, 7);

      let invoiceNumber = '000001';
      let controlNumber = '';

      await db.transaction('rw', db.invoiceSettings, async () => {
        const existing = await db.invoiceSettings.where('tenantId').equals(tenantSlug).first();

        let newNumber = 1;
        let controlPrefix = today.slice(-2);

        if (existing) {
          switch (existing.sequentialType) {
            case 'daily':
              if (existing.lastInvoiceDate === today) {
                newNumber = existing.lastInvoiceNumber + 1;
              }
              break;
            case 'monthly':
              if (existing.lastInvoiceDate?.startsWith(currentMonth)) {
                newNumber = existing.lastInvoiceNumber + 1;
                controlPrefix = currentMonth.replace('-', '');
              }
              break;
            case 'global':
              newNumber = existing.lastInvoiceNumber + 1;
              controlPrefix = existing.lastControlPrefix || '00';
              break;
          }
        }

        invoiceNumber = String(newNumber).padStart(6, '0');
        controlNumber = `${controlPrefix}-${invoiceNumber}`;

        const num = parseInt(invoiceNumber, 10);

        if (existing) {
          await db.invoiceSettings.put({
            ...existing,
            lastInvoiceNumber: num,
            lastInvoiceDate: today,
            lastControlPrefix: controlPrefix,
          });
        } else {
          await db.invoiceSettings.add({
            localId: crypto.randomUUID(),
            tenantId: tenantSlug,
            sequentialType: 'daily',
            lastInvoiceNumber: num,
            lastInvoiceDate: today,
            lastControlPrefix: controlPrefix,
            igtfEnabled: true,
            igtfPercentage: IGTF_PERCENTAGE,
          });
        }
      });

      return Ok({ invoiceNumber, controlNumber });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (attempt < maxRetries && (errorMessage.includes('TransactionInactiveError') || errorMessage.includes('ConstraintError'))) {
        logger.warn(`Retrying invoice number generation (attempt ${attempt + 1}/${maxRetries})`, { category: logCategories.SALES });
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        return retryGetNumber(attempt + 1);
      }
      
      logger.error('Error generating invoice number', error instanceof Error ? error : undefined, {
        category: logCategories.SALES,
      });
      return Err(new AppError('Error al generar numeración', 'NUMBERING_ERROR', 500));
    }
  };

  return retryGetNumber(0);
}

export function calculateTotals(
  items: InvoiceItem[],
  tasaBcv: number,
  igtfEnabled: boolean,
  igtfPercentage: number = IGTF_PERCENTAGE
): InvoiceTotals {
  const subtotalUsd = items.reduce((sum, item) => sum + item.precioUnitarioUsd * item.cantidad, 0);

  const baseImponibleBs = items
    .filter((item) => !item.exento)
    .reduce((sum, item) => sum + item.precioUnitarioUsd * item.cantidad * tasaBcv, 0);

  const montoIvaBs = items
    .filter((item) => !item.exento)
    .reduce((sum, item) => {
      const itemBase = item.precioUnitarioUsd * item.cantidad * tasaBcv;
      return sum + itemBase * (item.alicuotaIva / 100);
    }, 0);

  const montoExentoBs = items
    .filter((item) => item.exento)
    .reduce((sum, item) => sum + item.precioUnitarioUsd * item.cantidad * tasaBcv, 0);

  const totalBs = baseImponibleBs + montoIvaBs + montoExentoBs;

  let montoIgtfBs = 0;
  let totalFinalBs = totalBs;

  if (igtfEnabled) {
    montoIgtfBs = totalBs * (igtfPercentage / 100);
    totalFinalBs = totalBs + montoIgtfBs;
  }

  return {
    subtotalUsd: Math.round(subtotalUsd * 100) / 100,
    tasaBcv,
    baseImponibleBs: Math.round(baseImponibleBs * 100) / 100,
    montoIvaBs: Math.round(montoIvaBs * 100) / 100,
    montoExentoBs: Math.round(montoExentoBs * 100) / 100,
    totalBs: Math.round(totalBs * 100) / 100,
    aplicaIgtf: igtfEnabled,
    montoIgtfBs: Math.round(montoIgtfBs * 100) / 100,
    totalFinalBs: Math.round(totalFinalBs * 100) / 100,
  };
}

export function validateInvoiceInput(data: CreateInvoiceInput): string[] {
  const errors: string[] = [];

  if (!data.clienteNombre?.trim()) {
    errors.push('El nombre del cliente es requerido');
  }

  if (!data.clienteRifCedula?.trim()) {
    errors.push('El RIF/Cédula del cliente es requerido');
  } else if (!/^[JGVEPGCS]-?\d{7,8}-?\d$/i.test(data.clienteRifCedula.replace(/\s/g, ''))) {
    errors.push('El formato del RIF/Cédula no es válido');
  }

  if (!data.items || data.items.length === 0) {
    errors.push('La factura debe tener al menos un producto');
  }

  for (const item of data.items || []) {
    if (!item.descripcion?.trim()) {
      errors.push('La descripción del producto es requerida');
    }
    if (item.cantidad <= 0) {
      errors.push('La cantidad debe ser mayor a 0');
    }
    if (item.precioUnitarioUsd < 0) {
      errors.push('El precio no puede ser negativo');
    }
  }

  return errors;
}

function transformToInvoiceItems(input: CreateInvoiceItemInput[], tasaBcv: number): InvoiceItem[] {
  return input.map((item) => ({
    codigo: item.codigo || '',
    descripcion: item.descripcion,
    cantidad: item.cantidad,
    unidad: item.unidad || 'UND',
    precioUnitarioUsd: Math.round(item.precioUnitarioUsd * 10000) / 10000,
    tasaBcvItem: tasaBcv,
    alicuotaIva: item.alicuotaIva || IVA_PERCENTAGES.GENERAL,
    exento: item.exento || false,
    totalBs: Math.round(item.precioUnitarioUsd * item.cantidad * tasaBcv * 100) / 100,
  }));
}

export async function createInvoice(data: CreateInvoiceInput): Promise<Result<string, AppError>> {
  try {
    const tenantSlug = getCurrentTenantSlug();

    const errors = validateInvoiceInput(data);
    if (errors.length > 0) {
      return Err(new ValidationError(errors.join(', ')));
    }

    const taxpayerResult = await getTaxpayerInfo();
    if (!taxpayerResult.ok) return Err(taxpayerResult.error);

    const taxpayer = taxpayerResult.value;
    if (!taxpayer) {
      return Err(new AppError('No hay datos fiscales configurados', 'NO_TAXPAYER', 400));
    }

    const settingsResult = await getInvoiceSettings();
    if (!settingsResult.ok) return Err(settingsResult.error);

    const settings = settingsResult.value;

    const exchangeRateResult = await getExchangeRate();
    const tasaBcv = exchangeRateResult.ok && exchangeRateResult.value ? exchangeRateResult.value.rate : 36.5;

    const numerationResult = await getNextInvoiceNumber();
    if (!numerationResult.ok) return Err(numerationResult.error);

    const { invoiceNumber, controlNumber } = numerationResult.value;

    const items = transformToInvoiceItems(data.items, tasaBcv);
    const totals = calculateTotals(items, tasaBcv, settings?.igtfEnabled ?? true, settings?.igtfPercentage);

    const invoice: Invoice = {
      localId: crypto.randomUUID(),
      tenantId: tenantSlug,
      invoiceNumber,
      controlNumber,
      tipoDocumento: data.tipoDocumento || 'FACTURA',
      estatus: 'EMITIDA',
      emisorRif: taxpayer.rif,
      emisorRazonSocial: taxpayer.razonSocial,
      emisorDireccion: taxpayer.direccionFiscal,
      emisorNumeroProvidencia: taxpayer.numeroProvidencia,
      customerId: data.customerId,
      clienteNombre: data.clienteNombre,
      clienteRifCedula: data.clienteRifCedula,
      clienteDireccion: data.clienteDireccion,
      clienteTelefono: data.clienteTelefono,
      subtotalUsd: totals.subtotalUsd,
      tasaBcv: totals.tasaBcv,
      baseImponibleBs: totals.baseImponibleBs,
      montoIvaBs: totals.montoIvaBs,
      montoExentoBs: totals.montoExentoBs,
      totalBs: totals.totalBs,
      aplicaIgtf: totals.aplicaIgtf,
      montoIgtfBs: totals.montoIgtfBs,
      totalFinalBs: totals.totalFinalBs,
      saleId: data.saleId,
      createdAt: new Date(),
      items,
    };

    await db.transaction('rw', db.invoices, db.invoiceSettings, async () => {
      await db.invoices.add(invoice);

      const today = new Date().toISOString().split('T')[0];
      const num = parseInt(invoiceNumber, 10);
      const prefix = controlNumber.split('-')[0];

      const existingSettings = await db.invoiceSettings.where('tenantId').equals(tenantSlug).first();

      if (existingSettings) {
        await db.invoiceSettings.put({
          ...existingSettings,
          lastInvoiceNumber: num,
          lastInvoiceDate: today,
          lastControlPrefix: prefix,
        });
      } else {
        await db.invoiceSettings.add({
          localId: crypto.randomUUID(),
          tenantId: tenantSlug,
          sequentialType: 'daily',
          lastInvoiceNumber: num,
          lastInvoiceDate: today,
          lastControlPrefix: prefix,
          igtfEnabled: true,
          igtfPercentage: IGTF_PERCENTAGE,
        });
      }
    });

    await SyncEngine.addToQueue(
      'invoices',
      'create',
      {
        ...invoice,
        tenant_uuid: getCurrentTenantUuid(),
        tenant_slug: tenantSlug,
      } as unknown as Record<string, unknown>,
      invoice.localId
    );

    await movementsService.createMovement({
      type: 'income',
      category: 'sale',
      amount: totals.totalFinalBs,
      description: `Factura #${invoiceNumber} - ${data.clienteNombre}`,
      referenceType: 'invoice',
      referenceId: invoice.localId,
    }).catch(err => logger.error('Error creando movimiento de factura', err, { category: logCategories.SALES }));

    EventBus.emit(Events.INVOICE_CREATED, { invoice, invoiceNumber, total: totals.totalFinalBs });

    logger.info('Invoice created', {
      invoiceId: invoice.localId,
      invoiceNumber,
      total: totals.totalFinalBs,
      category: logCategories.SALES,
    });

    return Ok(invoice.localId);
  } catch (error) {
    logger.error('Error creating invoice', error instanceof Error ? error : undefined, {
      category: logCategories.SALES,
    });
    if (error instanceof AppError) return Err(error);
    return Err(new AppError('Error al crear factura', 'CREATE_INVOICE_ERROR', 500));
  }
}

export async function getInvoice(localId: string): Promise<Result<Invoice, AppError>> {
  try {
    const tenantSlug = getCurrentTenantSlug();
    const invoice = await db.invoices
      .where('localId')
      .equals(localId)
      .filter((inv) => inv.tenantId === tenantSlug)
      .first();

    if (!invoice) {
      return Err(new AppError('Factura no encontrada', 'NOT_FOUND', 404));
    }

    return Ok(invoice);
  } catch (error) {
    logger.error('Error getting invoice', error instanceof Error ? error : undefined, {
      category: logCategories.SALES,
    });
    return Err(new AppError('Error al obtener factura', 'GET_INVOICE_ERROR', 500));
  }
}

export async function getInvoices(filters?: InvoiceFilters): Promise<Result<Invoice[], AppError>> {
  try {
    const tenantSlug = getCurrentTenantSlug();
    let invoices = await db.invoices.where('tenantId').equals(tenantSlug).toArray();

    if (filters) {
      if (filters.estatus) {
        invoices = invoices.filter((inv) => inv.estatus === filters.estatus);
      }
      if (filters.tipoDocumento) {
        invoices = invoices.filter((inv) => inv.tipoDocumento === filters.tipoDocumento);
      }
      if (filters.invoiceNumber) {
        invoices = invoices.filter((inv) => inv.invoiceNumber.includes(filters.invoiceNumber!));
      }
      if (filters.cliente) {
        const search = filters.cliente.toLowerCase();
        invoices = invoices.filter(
          (inv) =>
            inv.clienteNombre.toLowerCase().includes(search) ||
            inv.clienteRifCedula.toLowerCase().includes(search)
        );
      }
      if (filters.fechaDesde) {
        invoices = invoices.filter((inv) => inv.createdAt >= filters.fechaDesde!);
      }
      if (filters.fechaHasta) {
        invoices = invoices.filter((inv) => inv.createdAt <= filters.fechaHasta!);
      }
    }

    invoices.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return Ok(invoices);
  } catch (error) {
    logger.error('Error getting invoices', error instanceof Error ? error : undefined, {
      category: logCategories.SALES,
    });
    return Err(new AppError('Error al obtener facturas', 'GET_INVOICES_ERROR', 500));
  }
}

export async function getInvoicesByCustomer(customerId: string): Promise<Result<Invoice[], AppError>> {
  try {
    const tenantSlug = getCurrentTenantSlug();
    const invoices = await db.invoices
      .where('tenantId')
      .equals(tenantSlug)
      .filter((inv) => inv.customerId === customerId)
      .toArray();

    invoices.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return Ok(invoices);
  } catch (error) {
    logger.error('Error getting customer invoices', error instanceof Error ? error : undefined, {
      category: logCategories.SALES,
    });
    return Err(new AppError('Error al obtener historial del cliente', 'GET_CUSTOMER_INVOICES_ERROR', 500));
  }
}

export async function annulInvoice(localId: string, reason: string): Promise<Result<void, AppError>> {
  try {
    const tenantSlug = getCurrentTenantSlug();
    const invoice = await db.invoices
      .where('localId')
      .equals(localId)
      .filter((inv) => inv.tenantId === tenantSlug)
      .first();

    if (!invoice) {
      return Err(new AppError('Factura no encontrada', 'NOT_FOUND', 404));
    }

    if (invoice.estatus === 'ANULADA') {
      return Err(new ValidationError('La factura ya está anulada'));
    }

    if (!reason?.trim()) {
      return Err(new ValidationError('El motivo de anulación es requerido'));
    }

    const updated: Invoice = {
      ...invoice,
      estatus: 'ANULADA',
      annulledAt: new Date(),
      annulledReason: reason,
    };

    await SyncEngine.addToQueue('invoices', 'update', updated as unknown as Record<string, unknown>, localId);

    await db.invoices.put(updated);

    await movementsService.createMovement({
      type: 'expense',
      category: 'refund',
      amount: invoice.totalFinalBs,
      description: `Anulación de factura #${invoice.invoiceNumber} - ${reason}`,
      referenceType: 'invoice',
      referenceId: localId,
    }).catch(err => logger.error('Error creando movimiento de anulación', err, { category: logCategories.SALES }));

    EventBus.emit(Events.INVOICE_CANCELLED, { invoice, reason });

    if (invoice.saleId) {
      const { cancelSale } = await import('@/features/sales/services/sales.service');
      cancelSale(invoice.saleId).catch(err => {
        logger.warn('No se pudo cancelar venta asociada a factura', { 
          invoiceId: localId, 
          saleId: invoice.saleId, 
          error: err instanceof Error ? err.message : String(err),
          category: logCategories.SALES 
        });
      });
    }

    logger.info('Invoice annulled', { invoiceId: localId, invoiceNumber: invoice.invoiceNumber, reason, hasSaleId: !!invoice.saleId, category: logCategories.SALES });

    return Ok(undefined);
  } catch (error) {
    logger.error('Error annulling invoice', error instanceof Error ? error : undefined, {
      category: logCategories.SALES,
    });
    if (error instanceof AppError) return Err(error);
    return Err(new AppError('Error al anular factura', 'ANNUL_INVOICE_ERROR', 500));
  }
}

export async function isInvoicingEnabled(): Promise<boolean> {
  const taxpayer = await getTaxpayerInfo();
  return taxpayer.ok && taxpayer.value !== null;
}

export function formatRif(rif: string): string {
  return rif.replace(/(\w)-?(\d{7,8})-?(\d)/i, '$1-$2-$3').toUpperCase();
}
