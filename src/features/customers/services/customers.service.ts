import { db, Customer } from '@/lib/db';
import { SyncEngine } from '@/lib/sync/SyncEngine';
import { EventBus, Events } from '@/lib/events/EventBus';
import { useTenantStore } from '@/store/useTenantStore';
import { Ok, Err, Result, ValidationError, AppError } from '@/lib/types/result';
import { logger, logCategories } from '@/lib/logger';
import { CreateCustomerInput, UpdateCustomerInput, CustomerFilters } from '../types/customers.types';

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

export function validateRif(rif: string): boolean {
  return /^[JGVEPG]-?\d{7,8}-?\d$/i.test(rif.replace(/\s/g, ''));
}

export function validateCustomerInput(data: CreateCustomerInput): string[] {
  const errors: string[] = [];

  if (!data.nombreRazonSocial?.trim()) {
    errors.push('El nombre o razón social es requerido');
  }

  if (!data.rifCedula?.trim()) {
    errors.push('El RIF/Cédula es requerido');
  } else if (!validateRif(data.rifCedula)) {
    errors.push('El formato del RIF/Cédula no es válido');
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('El formato del email no es válido');
  }

  return errors;
}

export async function getCustomers(filters?: CustomerFilters): Promise<Result<Customer[], AppError>> {
  try {
    const tenantSlug = getCurrentTenantSlug();
    let customers = await db.customers.where('tenantId').equals(tenantSlug).toArray();

    if (filters) {
      if (filters.isActive !== undefined) {
        customers = customers.filter((c) => c.isActive === filters.isActive);
      }

      if (filters.search?.trim()) {
        const search = filters.search.toLowerCase();
        customers = customers.filter(
          (c) =>
            c.nombreRazonSocial.toLowerCase().includes(search) ||
            c.rifCedula.toLowerCase().includes(search) ||
            (c.email && c.email.toLowerCase().includes(search))
        );
      }
    }

    customers.sort((a, b) => a.nombreRazonSocial.localeCompare(b.nombreRazonSocial));

    return Ok(customers);
  } catch (error) {
    logger.error('Error getting customers', error instanceof Error ? error : undefined, {
      category: logCategories.SALES,
    });
    return Err(new AppError('Error al obtener clientes', 'GET_CUSTOMERS_ERROR', 500));
  }
}

export async function getCustomer(localId: string): Promise<Result<Customer, AppError>> {
  try {
    const tenantSlug = getCurrentTenantSlug();
    const customer = await db.customers
      .where('localId')
      .equals(localId)
      .filter((c) => c.tenantId === tenantSlug)
      .first();

    if (!customer) {
      return Err(new AppError('Cliente no encontrado', 'NOT_FOUND', 404));
    }

    return Ok(customer);
  } catch (error) {
    logger.error('Error getting customer', error instanceof Error ? error : undefined, {
      category: logCategories.SALES,
    });
    return Err(new AppError('Error al obtener cliente', 'GET_CUSTOMER_ERROR', 500));
  }
}

export async function createCustomer(data: CreateCustomerInput): Promise<Result<string, AppError>> {
  try {
    const tenantSlug = getCurrentTenantSlug();

    const errors = validateCustomerInput(data);
    if (errors.length > 0) {
      return Err(new ValidationError(errors.join(', ')));
    }

    const localId = crypto.randomUUID();
    const customer: Customer = {
      localId,
      tenantId: tenantSlug,
      nombreRazonSocial: data.nombreRazonSocial.trim(),
      rifCedula: data.rifCedula.trim().toUpperCase(),
      direccion: data.direccion?.trim(),
      telefono: data.telefono?.trim(),
      email: data.email?.trim().toLowerCase(),
      isActive: true,
      createdAt: new Date(),
    };

    await db.transaction('rw', db.customers, async () => {
      const existing = await db.customers
        .where('tenantId')
        .equals(tenantSlug)
        .filter((c) => c.rifCedula === data.rifCedula.trim())
        .first();

      if (existing) {
        throw new ValidationError('Ya existe un cliente con este RIF/Cédula');
      }

      await db.customers.add(customer);
    });

    await SyncEngine.addToQueue(
      'customers',
      'create',
      {
        ...customer,
        tenant_uuid: getCurrentTenantUuid(),
        tenant_slug: tenantSlug,
      } as unknown as Record<string, unknown>,
      localId
    );

    EventBus.emit(Events.CUSTOMER_CREATED, { customer });

    logger.info('Customer created', { customerId: localId, name: data.nombreRazonSocial, category: logCategories.SALES });

    return Ok(localId);
  } catch (error) {
    logger.error('Error creating customer', error instanceof Error ? error : undefined, {
      category: logCategories.SALES,
    });
    if (error instanceof AppError) return Err(error);
    return Err(new AppError('Error al crear cliente', 'CREATE_CUSTOMER_ERROR', 500));
  }
}

export async function updateCustomer(
  localId: string,
  data: UpdateCustomerInput
): Promise<Result<void, AppError>> {
  try {
    const tenantSlug = getCurrentTenantSlug();
    const customer = await db.customers
      .where('localId')
      .equals(localId)
      .filter((c) => c.tenantId === tenantSlug)
      .first();

    if (!customer) {
      return Err(new AppError('Cliente no encontrado', 'NOT_FOUND', 404));
    }

    if (data.rifCedula && data.rifCedula !== customer.rifCedula) {
      if (!validateRif(data.rifCedula)) {
        return Err(new ValidationError('El formato del RIF/Cédula no es válido'));
      }
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return Err(new ValidationError('El formato del email no es válido'));
    }

    const updated: Customer = {
      ...customer,
      nombreRazonSocial: data.nombreRazonSocial?.trim() ?? customer.nombreRazonSocial,
      rifCedula: data.rifCedula?.trim().toUpperCase() ?? customer.rifCedula,
      direccion: data.direccion?.trim() ?? customer.direccion,
      telefono: data.telefono?.trim() ?? customer.telefono,
      email: data.email?.trim().toLowerCase() ?? customer.email,
      isActive: data.isActive ?? customer.isActive,
      updatedAt: new Date(),
    };

    await db.transaction('rw', db.customers, async () => {
      if (data.rifCedula && data.rifCedula !== customer.rifCedula) {
        const newRif = data.rifCedula.trim();
        const existing = await db.customers
          .where('tenantId')
          .equals(tenantSlug)
          .filter((c) => c.rifCedula === newRif && c.localId !== localId)
          .first();

        if (existing) {
          throw new ValidationError('Ya existe otro cliente con este RIF/Cédula');
        }
      }

      await db.customers.put(updated);
    });

    await SyncEngine.addToQueue('customers', 'update', updated as unknown as Record<string, unknown>, localId);

    logger.info('Customer updated', { customerId: localId, category: logCategories.SALES });

    return Ok(undefined);
  } catch (error) {
    logger.error('Error updating customer', error instanceof Error ? error : undefined, {
      category: logCategories.SALES,
    });
    if (error instanceof AppError) return Err(error);
    return Err(new AppError('Error al actualizar cliente', 'UPDATE_CUSTOMER_ERROR', 500));
  }
}

export async function deleteCustomer(localId: string): Promise<Result<void, AppError>> {
  try {
    const tenantSlug = getCurrentTenantSlug();
    const customer = await db.customers
      .where('localId')
      .equals(localId)
      .filter((c) => c.tenantId === tenantSlug)
      .first();

    if (!customer) {
      return Err(new AppError('Cliente no encontrado', 'NOT_FOUND', 404));
    }

    const updated: Customer = {
      ...customer,
      isActive: false,
      updatedAt: new Date(),
    };

    await db.customers.put(updated);

    await SyncEngine.addToQueue('customers', 'update', updated as unknown as Record<string, unknown>, localId);

    logger.info('Customer deactivated', { customerId: localId, category: logCategories.SALES });

    return Ok(undefined);
  } catch (error) {
    logger.error('Error deactivating customer', error instanceof Error ? error : undefined, {
      category: logCategories.SALES,
    });
    if (error instanceof AppError) return Err(error);
    return Err(new AppError('Error al eliminar cliente', 'DELETE_CUSTOMER_ERROR', 500));
  }
}

export async function hardDeleteCustomer(localId: string): Promise<Result<void, AppError>> {
  try {
    const tenantSlug = getCurrentTenantSlug();
    const customer = await db.customers
      .where('localId')
      .equals(localId)
      .filter((c) => c.tenantId === tenantSlug)
      .first();

    if (!customer) {
      return Err(new AppError('Cliente no encontrado', 'NOT_FOUND', 404));
    }

    await db.customers.where('localId').equals(localId).delete();
    await SyncEngine.addToQueue('customers', 'delete', { localId }, localId);

    logger.info('Customer permanently deleted', { customerId: localId, category: logCategories.SALES });

    return Ok(undefined);
  } catch (error) {
    logger.error('Error permanently deleting customer', error instanceof Error ? error : undefined, {
      category: logCategories.SALES,
    });
    if (error instanceof AppError) return Err(error);
    return Err(new AppError('Error al eliminar cliente permanentemente', 'HARD_DELETE_CUSTOMER_ERROR', 500));
  }
}

export async function searchCustomers(query: string): Promise<Result<Customer[], AppError>> {
  return getCustomers({ search: query, isActive: true });
}

export async function getCustomerCount(): Promise<Result<number, AppError>> {
  try {
    const tenantSlug = getCurrentTenantSlug();
    const customers = await db.customers.where('tenantId').equals(tenantSlug).filter((c) => c.isActive).toArray();
    return Ok(customers.length);
  } catch (error) {
    logger.error('Error getting customer count', error instanceof Error ? error : undefined, {
      category: logCategories.SALES,
    });
    return Err(new AppError('Error al contar clientes', 'COUNT_CUSTOMERS_ERROR', 500));
  }
}
