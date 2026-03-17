import { db, TenantSetting } from '@/lib/db';
import { useTenantStore } from '@/store/useTenantStore';
import { logger, logCategories } from '@/lib/logger';
import { EventBus, Events } from '@/lib/events/EventBus';
import { Ok, Err, Result, AppError, isOk } from '@/lib/types/result';

export interface ExchangeRate {
  rate: number;
  updatedAt: Date;
  source: 'api' | 'manual';
}

const SETTING_KEY = 'bcv_rate';
const SETTING_UPDATED_KEY = 'bcv_rate_updated';
const SETTING_SOURCE_KEY = 'bcv_rate_source';

function getCurrentTenantSlug(): string {
  const { currentTenant } = useTenantStore.getState();
  if (!currentTenant) {
    throw new AppError('No hay tenant activo', 'NO_TENANT', 400);
  }
  return currentTenant.slug;
}

export async function getExchangeRate(): Promise<Result<ExchangeRate | null, AppError>> {
  try {
    const tenantSlug = getCurrentTenantSlug();
    const settings = await db.settings.where({ tenantId: tenantSlug, key: SETTING_KEY }).first();
    
    if (!settings) {
      return Ok(null);
    }

    const updatedSetting = await db.settings.where({ tenantId: tenantSlug, key: SETTING_UPDATED_KEY }).first();
    const sourceSetting = await db.settings.where({ tenantId: tenantSlug, key: SETTING_SOURCE_KEY }).first();

    return Ok({
      rate: Number(settings.value) || 0,
      updatedAt: updatedSetting ? new Date(updatedSetting.value as string) : new Date(),
      source: (sourceSetting?.value as 'api' | 'manual') || 'manual',
    });
  } catch (error) {
    logger.warn('Error getting exchange rate', { error: error instanceof Error ? error.message : 'Unknown', category: logCategories.SALES });
    return Err(new AppError('Error al obtener tasa de cambio', 'GET_EXCHANGE_RATE_ERROR', 500));
  }
}

async function saveExchangeRate(rate: number, source: 'api' | 'manual'): Promise<void> {
  const tenantSlug = getCurrentTenantSlug();
  const now = new Date();

  try {
    const settingsToSave: TenantSetting[] = [
      { tenantId: tenantSlug, key: SETTING_KEY, value: rate },
      { tenantId: tenantSlug, key: SETTING_UPDATED_KEY, value: now.toISOString() },
      { tenantId: tenantSlug, key: SETTING_SOURCE_KEY, value: source },
    ];

    await db.settings.bulkPut(settingsToSave);
    logger.info('Exchange rate saved', { rate, source, category: logCategories.SALES });
  } catch (err) {
    logger.error('saveExchangeRate failed', err instanceof Error ? err : undefined, { category: logCategories.SALES });
    throw err;
  }
}

async function fetchBCVRate(): Promise<number | null> {
  const apis = [
    {
      url: 'https://ve.dolarapi.com/v1/dolares/oficial',
      extract: (data: unknown) => {
        const d = data as { promedio?: number };
        return d?.promedio || null;
      },
    },
    {
      url: 'https://ve.dolarapi.com/v1/dolares',
      extract: (data: unknown) => {
        const list = data as { fuente?: string; promedio?: number }[];
        const bcv = Array.isArray(list) ? list.find(d => d.fuente === 'oficial') : null;
        return bcv?.promedio || null;
      },
    },
  ];

  for (const api of apis) {
    try {
      const response = await fetch(api.url, {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) continue;

      const data = await response.json();
      const price = api.extract(data);

      if (price && typeof price === 'number' && price > 0) {
        logger.info('Fetched BCV rate', { price, api: api.url, category: logCategories.SALES });
        return price;
      }
    } catch (error) {
      logger.warn('Failed to fetch from API', { api: api.url, error: error instanceof Error ? error.message : 'Unknown', category: logCategories.SALES });
    }
  }

  logger.error('All BCV APIs failed', undefined, { category: logCategories.SALES });
  return null;
}

export async function updateExchangeRate(manualRate?: number): Promise<{ success: boolean; rate?: number; error?: string }> {
  try {
    let rate: number;
    let source: 'api' | 'manual';

    if (manualRate && manualRate > 0) {
      rate = manualRate;
      source = 'manual';
    } else {
      const fetchedRate = await fetchBCVRate();
      
      if (!fetchedRate) {
        const cachedResult = await getExchangeRate();
        if (isOk(cachedResult) && cachedResult.value) {
          return { success: false, error: 'API no disponible. Usando tasa cacheada: ' + cachedResult.value.rate };
        }
        return { success: false, error: 'No hay tasa disponible. Configure manualmente.' };
      }
      
      rate = fetchedRate;
      source = 'api';
    }

    await saveExchangeRate(rate, source);
    
    EventBus.emit(Events.EXCHANGE_RATE_UPDATED, { rate, source });
    
    return { success: true, rate };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Error updating exchange rate', error instanceof Error ? error : undefined, { category: logCategories.SALES, detail: msg });
    return { success: false, error: `Error al actualizar tasa: ${msg}` };
  }
}

export function formatBs(value: number): string {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'VES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function shouldUpdateRate(lastUpdated: Date | null): boolean {
  if (!lastUpdated) return true;
  
  const now = new Date();
  const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
  
  return hoursSinceUpdate >= 12;
}

export async function autoUpdateIfNeeded(): Promise<void> {
  const result = await getExchangeRate();
  
  if (isOk(result) && result.value && shouldUpdateRate(result.value.updatedAt)) {
    await updateExchangeRate();
  }
}
