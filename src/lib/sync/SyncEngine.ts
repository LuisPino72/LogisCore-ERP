import { Table } from 'dexie';
import { db, SyncQueueItem } from '../db';
import { supabase } from '../supabase';
import { EventBus, Events } from '../events/EventBus';
import { useTenantStore } from '../../store/useTenantStore';
import { logger, logCategories } from '../logger';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: SyncQueueItem[];
}

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

interface CircuitBreakerState {
  status: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailureTime: number;
  successCount: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,
  successThreshold: 2,
  timeoutMs: 60000,
};

class SyncEngineClass {
  private isSyncing = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private readonly SYNC_INTERVAL_MS = 30000;
  private retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG;
  private circuitBreaker: CircuitBreakerState = {
    status: 'closed',
    failures: 0,
    lastFailureTime: 0,
    successCount: 0,
  };

  async start(): Promise<void> {
    if (this.syncInterval) return;
    
    this.syncInterval = setInterval(() => {
      this.syncPending();
    }, this.SYNC_INTERVAL_MS);

    await this.syncPending();
  }

  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * delay;
    return Math.min(delay + jitter, this.retryConfig.maxDelayMs);
  }

  private isCircuitOpen(): boolean {
    if (this.circuitBreaker.status === 'closed') return false;
    
    if (Date.now() - this.circuitBreaker.lastFailureTime > CIRCUIT_BREAKER_CONFIG.timeoutMs) {
      this.circuitBreaker.status = 'half-open';
      this.circuitBreaker.successCount = 0;
      logger.info('Circuit breaker transitioning to half-open', { category: logCategories.SYNC });
      return false;
    }
    
    return true;
  }

  private recordSuccess(): void {
    this.circuitBreaker.failures = 0;
    
    if (this.circuitBreaker.status === 'half-open') {
      this.circuitBreaker.successCount++;
      if (this.circuitBreaker.successCount >= CIRCUIT_BREAKER_CONFIG.successThreshold) {
        this.circuitBreaker.status = 'closed';
        logger.info('Circuit breaker closed', { category: logCategories.SYNC });
      }
    }
  }

  private recordFailure(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();
    
    if (this.circuitBreaker.status === 'half-open') {
      this.circuitBreaker.status = 'open';
      logger.warn('Circuit breaker opened after half-open failure', { category: logCategories.SYNC });
    } else if (this.circuitBreaker.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
      this.circuitBreaker.status = 'open';
      logger.warn('Circuit breaker opened', { 
        failures: this.circuitBreaker.failures,
        category: logCategories.SYNC 
      });
    }
  }

  getCircuitStatus(): CircuitBreakerState {
    return { ...this.circuitBreaker };
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        const isRetryable = this.isRetryableError(error);
        
        if (!isRetryable || attempt === this.retryConfig.maxRetries - 1) {
          throw lastError;
        }
        
        const delay = this.calculateDelay(attempt);
        logger.warn(`Retry ${operationName} in ${delay}ms`, { 
          attempt: attempt + 1,
          maxRetries: this.retryConfig.maxRetries,
          category: logCategories.SYNC,
        });
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  private isRetryableError(error: unknown): boolean {
    const errorStr = String(error).toLowerCase();
    return (
      errorStr.includes('network') ||
      errorStr.includes('timeout') ||
      errorStr.includes('econnrefused') ||
      errorStr.includes('fetch failed') ||
      errorStr.includes('503') ||
      errorStr.includes('429')
    );
  }

  async addToQueue(
    tableName: string,
    operation: 'create' | 'update' | 'delete',
    data: Record<string, unknown>,
    localId: string
  ): Promise<void> {
    const { currentTenant } = useTenantStore.getState();
    if (!currentTenant) return;

    await db.syncQueue.add({
      tableName,
      operation,
      data,
      localId,
      tenantId: currentTenant.slug,
      tenantUuid: currentTenant.id,
      status: 'pending',
      createdAt: new Date(),
      retryCount: 0,
    });

    EventBus.emit(Events.SYNC_STATUS_CHANGED, { status: 'pending' });
  }

  async syncPending(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, synced: 0, failed: 0, conflicts: [] };
    }

    if (this.isCircuitOpen()) {
      logger.warn('Circuit breaker open, skipping sync', { category: logCategories.SYNC });
      return { success: false, synced: 0, failed: 0, conflicts: [] };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      conflicts: [],
    };

    try {
      const pending = await db.syncQueue
        .where('status')
        .equals('pending')
        .toArray();

      for (const item of pending) {
        try {
          await this.processItem(item);
          this.recordSuccess();
          result.synced++;
        } catch (error) {
          const isConflict = this.isConflictError(error);
          
          if (!isConflict) {
            this.recordFailure();
          }
          
          await db.syncQueue.update(item.id!, {
            status: isConflict ? 'conflict' : 'failed',
            errorMessage: isConflict ? 'Conflicto de datos' : String(error),
            retryCount: item.retryCount + 1,
          });

          if (isConflict) {
            result.conflicts.push(item);
            EventBus.emit(Events.CONFLICT_DETECTED, item);
            logger.warn('Sync conflict detected', { 
              itemId: item.id,
              tableName: item.tableName,
              category: logCategories.SYNC,
            });
          } else {
            result.failed++;
            logger.error('Sync failed', error instanceof Error ? error : undefined, { 
              itemId: item.id,
              tableName: item.tableName,
              category: logCategories.SYNC,
            });
          }
        }
      }

      EventBus.emit(Events.SYNC_STATUS_CHANGED, { 
        status: result.conflicts.length > 0 ? 'conflict' : 'idle' 
      });
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  private toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (obj[key] instanceof Date) {
        result[snakeKey] = (obj[key] as Date).toISOString();
      } else if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        result[snakeKey] = this.toSnakeCase(obj[key] as Record<string, unknown>);
      } else {
        result[snakeKey] = obj[key];
      }
    }
    return result;
  }

  private async processItem(item: SyncQueueItem): Promise<void> {
    await db.syncQueue.update(item.id!, { status: 'syncing' });

    const snakeCaseData = this.toSnakeCase(item.data);

    const syncOperation = async () => {
      const { data, error } = await supabase.functions.invoke('sync_table_item', {
        body: {
          p_table: item.tableName,
          p_operation: item.operation,
          p_data: snakeCaseData,
          p_local_id: item.localId,
          p_tenant_uuid: item.tenantUuid || item.tenantId,
          p_tenant_slug: item.tenantId,
        },
      });

      if (error) {
        logger.error('Sync Edge Function error', error, { category: logCategories.SYNC });
        throw error;
      }

      if (data?.error) {
        logger.error('Sync Edge Function returned error', new Error(data.error), { category: logCategories.SYNC });
        throw new Error(data.error);
      }
    };

    await this.retryOperation(syncOperation, `sync ${item.tableName}:${item.operation}`);

    await db.syncQueue.update(item.id!, {
      status: 'synced',
      syncedAt: new Date(),
    });
  }

  private isConflictError(error: unknown): boolean {
    const errorStr = String(error).toLowerCase();
    return errorStr.includes('conflict') || 
           errorStr.includes('duplicate') ||
           errorStr.includes('violation');
  }

  async resolveConflict(
    itemId: number,
    resolution: 'local' | 'server'
  ): Promise<void> {
    const item = await db.syncQueue.get(itemId);
    if (!item) return;

    if (resolution === 'local') {
      await this.processItem(item);
    } else {
      try {
        const { data, error } = await supabase
          .from(item.tableName)
          .select()
          .eq('local_id', item.localId)
          .single();

        if (error || !data) {
          logger.error('Failed to fetch server data for conflict resolution', error as Error, {
            tableName: item.tableName,
            localId: item.localId,
            category: logCategories.SYNC,
          });
          return;
        }

        const serverData = this.sanitizeServerData(data);

        const table = db[item.tableName as keyof typeof db] as Table<Record<string, unknown>>;
        await table.where('localId').equals(item.localId).modify(serverData);
        
        logger.info('Conflict resolved with server data', {
          tableName: item.tableName,
          localId: item.localId,
          category: logCategories.SYNC,
        });
      } catch (error) {
        logger.error('Error resolving conflict with server data', error as Error, {
          tableName: item.tableName,
          localId: item.localId,
          category: logCategories.SYNC,
        });
        return;
      }
    }

    await db.syncQueue.delete(itemId);
  }

  private sanitizeServerData(data: Record<string, unknown>): Record<string, unknown> {
    const ignoredFields = ['tenant_id', 'tenant_slug', 'created_at', 'updated_at', 'synced_at'];
    const result: Record<string, unknown> = {};
    
    for (const key in data) {
      if (ignoredFields.includes(key)) continue;
      
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = data[key];
    }
    
    return result;
  }

  reset(): void {
    this.circuitBreaker = {
      status: 'closed',
      failures: 0,
      lastFailureTime: 0,
      successCount: 0,
    };
    this.isSyncing = false;
    logger.info('SyncEngine reset', { category: logCategories.SYNC });
  }

  async retryFailedItems(): Promise<SyncResult> {
    const failedItems = await db.syncQueue
      .where('status')
      .equals('failed')
      .toArray();

    for (const item of failedItems) {
      await db.syncQueue.update(item.id!, { status: 'pending', retryCount: 0 });
    }

    logger.info(`Marked ${failedItems.length} failed items for retry`, { category: logCategories.SYNC });
    
    return this.syncPending();
  }

  async getSyncStats(): Promise<{
    pending: number;
    failed: number;
    conflicts: number;
    synced: number;
    circuitStatus: CircuitBreakerState;
  }> {
    const [pending, failed, conflicts] = await Promise.all([
      db.syncQueue.where('status').equals('pending').count(),
      db.syncQueue.where('status').equals('failed').count(),
      db.syncQueue.where('status').equals('conflict').count(),
    ]);

    return {
      pending,
      failed,
      conflicts,
      synced: 0,
      circuitStatus: this.getCircuitStatus(),
    };
  }

  async getConflicts(): Promise<SyncQueueItem[]> {
    return db.syncQueue.where('status').equals('conflict').toArray();
  }

  async getPendingCount(): Promise<number> {
    return db.syncQueue.where('status').equals('pending').count();
  }
}

export const SyncEngine = new SyncEngineClass();
