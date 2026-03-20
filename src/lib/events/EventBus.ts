/**
 * Tipo para callbacks de eventos.
 */
type EventCallback = (data: unknown) => void;

/**
 * Sistema de eventos simple para comunicación entre módulos.
 * Usa console.error directamente para evitar dependencias circulares con el logger.
 */
class EventBusClass {
  private events: Map<string, EventCallback[]> = new Map();

  /**
   * Suscribe un callback a un evento.
   * @param event - Nombre del evento
   * @param callback - Función a ejecutar cuando ocurra el evento
   * @returns Función para cancelar la suscripción
   */
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

  /**
   * Emite un evento, ejecutando todos los callbacks registrados.
   * Los errores en callbacks individuales se capturan para no afectar otros callbacks.
   * @param event - Nombre del evento
   * @param data - Datos opcionales a pasar a los callbacks
   */
  emit(event: string, data?: unknown): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (error) {
          console.error(`[EventBus] Error in event "${event}":`, error);
        }
      });
    }
  }

  /**
   * Cancela la suscripción de un callback específico.
   * @param event - Nombre del evento
   * @param callback - Callback a remover
   */
  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  /**
   * Limpia todos los eventos registrados.
   */
  clear(): void {
    this.events.clear();
  }
}

export const EventBus = new EventBusClass();

/**
 * Constantes de nombres de eventos del sistema.
 */
export const Events = {
  SALE_COMPLETED: 'sale.completed',
  SALE_CANCELLED: 'sale.cancelled',
  INVENTORY_UPDATED: 'inventory.updated',
  STOCK_LOW: 'stock.low',
  SYNC_STATUS_CHANGED: 'sync.status.changed',
  CONFLICT_DETECTED: 'conflict.detected',
  TENANT_CHANGED: 'tenant.changed',
  EXCHANGE_RATE_UPDATED: 'exchange.rate.updated',
  PURCHASE_COMPLETED: 'purchase.completed',
  PURCHASE_CANCELLED: 'purchase.cancelled',
  PRODUCTION_COMPLETED: 'production.completed',
  CUSTOMER_CREATED: 'customer.created',
  SUPPLIER_CREATED: 'supplier.created',
  INVOICE_CREATED: 'invoice.created',
  INVOICE_CANCELLED: 'invoice.cancelled',
} as const;
