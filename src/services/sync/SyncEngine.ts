import { db, SyncQueueItem } from '../db';
import { supabase } from '../supabase';
import { EventBus, Events } from '../events/EventBus';
import { useTenantStore } from '../../store/useTenantStore';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: SyncQueueItem[];
}

class SyncEngineClass {
  private isSyncing = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private readonly SYNC_INTERVAL_MS = 30000;

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
          result.synced++;
        } catch (error) {
          const isConflict = this.isConflictError(error);
          
          await db.syncQueue.update(item.id!, {
            status: isConflict ? 'conflict' : 'failed',
            errorMessage: isConflict ? 'Conflicto de datos' : String(error),
            retryCount: item.retryCount + 1,
          });

          if (isConflict) {
            result.conflicts.push(item);
            EventBus.emit(Events.CONFLICT_DETECTED, item);
          } else {
            result.failed++;
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

  private async processItem(item: SyncQueueItem): Promise<void> {
    const schema = `tenant_${item.tenantId}`;
    
    await db.syncQueue.update(item.id!, { status: 'syncing' });

    const { error } = await supabase.rpc('sync_table_item', {
      p_schema: schema,
      p_table: item.tableName,
      p_operation: item.operation,
      p_data: item.data,
      p_local_id: item.localId,
    });

    if (error) throw error;

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
    }

    await db.syncQueue.delete(itemId);
  }

  async getConflicts(): Promise<SyncQueueItem[]> {
    return db.syncQueue.where('status').equals('conflict').toArray();
  }

  async getPendingCount(): Promise<number> {
    return db.syncQueue.where('status').equals('pending').count();
  }
}

export const SyncEngine = new SyncEngineClass();
