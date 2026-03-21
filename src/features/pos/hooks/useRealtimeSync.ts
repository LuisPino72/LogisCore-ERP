import { useEffect } from 'react';
import { EventBus, Events } from '@/lib/events/EventBus';

export function useRealtimeSync(
  onInventoryUpdate?: () => void,
  onSaleCompleted?: () => void,
  onSaleCancelled?: () => void,
  onSyncStatusChanged?: () => void
): void {
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    if (onInventoryUpdate) {
      unsubscribers.push(
        EventBus.on(Events.INVENTORY_UPDATED, () => {
          onInventoryUpdate();
        })
      );
    }

    if (onSaleCompleted) {
      unsubscribers.push(
        EventBus.on(Events.SALE_COMPLETED, () => {
          onSaleCompleted();
        })
      );
    }

    if (onSaleCancelled) {
      unsubscribers.push(
        EventBus.on(Events.SALE_CANCELLED, () => {
          onSaleCancelled();
        })
      );
    }

    if (onSyncStatusChanged) {
      unsubscribers.push(
        EventBus.on(Events.SYNC_STATUS_CHANGED, () => {
          onSyncStatusChanged();
        })
      );
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [onInventoryUpdate, onSaleCompleted, onSaleCancelled, onSyncStatusChanged]);
}
