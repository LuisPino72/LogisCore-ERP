import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus, Events } from '@/lib/events/EventBus';

vi.spyOn(console, 'error').mockImplementation(() => {});

describe('EventBus', () => {
  beforeEach(() => {
    EventBus.clear();
    vi.clearAllMocks();
  });

  it('debe suscribirse y emitir eventos', () => {
    const callback = vi.fn();
    EventBus.on('test.event', callback);
    
    EventBus.emit('test.event', { data: 'test' });
    
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({ data: 'test' });
  });

  it('debe permitir desuscribirse', () => {
    const callback = vi.fn();
    const unsubscribe = EventBus.on('test.event', callback);
    
    unsubscribe();
    EventBus.emit('test.event', {});
    
    expect(callback).not.toHaveBeenCalled();
  });

  it('debe manejar múltiples suscriptores', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    
    EventBus.on('test.event', callback1);
    EventBus.on('test.event', callback2);
    
    EventBus.emit('test.event', {});
    
    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledTimes(1);
  });

  it('debe tener los eventos predefinidos correctos', () => {
    expect(Events.SALE_COMPLETED).toBe('sale.completed');
    expect(Events.SALE_CANCELLED).toBe('sale.cancelled');
    expect(Events.INVENTORY_UPDATED).toBe('inventory.updated');
    expect(Events.STOCK_LOW).toBe('stock.low');
    expect(Events.SYNC_STATUS_CHANGED).toBe('sync.status.changed');
    expect(Events.CONFLICT_DETECTED).toBe('conflict.detected');
    expect(Events.TENANT_CHANGED).toBe('tenant.changed');
  });
});
