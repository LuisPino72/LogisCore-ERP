type EventCallback = (data: unknown) => void;

class EventBusClass {
  private events: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);

    return () => {
      const callbacks = this.events.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) callbacks.splice(index, 1);
      }
    };
  }

  emit(event: string, data?: unknown): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (error) {
          console.error(`Error en EventBus evento "${event}":`, error);
        }
      });
    }
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  clear(): void {
    this.events.clear();
  }
}

export const EventBus = new EventBusClass();

export const Events = {
  SALE_COMPLETED: 'sale.completed',
  SALE_CANCELLED: 'sale.cancelled',
  INVENTORY_UPDATED: 'inventory.updated',
  STOCK_LOW: 'stock.low',
  SYNC_STATUS_CHANGED: 'sync.status.changed',
  CONFLICT_DETECTED: 'conflict.detected',
  TENANT_CHANGED: 'tenant.changed',
} as const;
