import { describe, it, expect } from 'vitest';

describe('Circuit Breaker Logic', () => {
  const CIRCUIT_BREAKER_CONFIG = {
    failureThreshold: 5,
    successThreshold: 2,
    timeoutMs: 60000,
  };

  type CircuitStatus = 'closed' | 'open' | 'half-open';

  interface CircuitBreakerState {
    status: CircuitStatus;
    failures: number;
    lastFailureTime: number;
    successCount: number;
  };

  const createCircuitBreaker = (): CircuitBreakerState => ({
    status: 'closed',
    failures: 0,
    lastFailureTime: 0,
    successCount: 0,
  });

  const isCircuitOpen = (cb: CircuitBreakerState): boolean => {
    if (cb.status === 'closed') return false;
    
    if (Date.now() - cb.lastFailureTime > CIRCUIT_BREAKER_CONFIG.timeoutMs) {
      cb.status = 'half-open';
      cb.successCount = 0;
      return false;
    }
    
    return true;
  };

  const recordSuccess = (cb: CircuitBreakerState): void => {
    cb.failures = 0;
    
    if (cb.status === 'half-open') {
      cb.successCount++;
      if (cb.successCount >= CIRCUIT_BREAKER_CONFIG.successThreshold) {
        cb.status = 'closed';
      }
    }
  };

  const recordFailure = (cb: CircuitBreakerState): void => {
    cb.failures++;
    cb.lastFailureTime = Date.now();
    
    if (cb.status === 'half-open') {
      cb.status = 'open';
    } else if (cb.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
      cb.status = 'open';
    }
  };

  it('debe iniciar en estado closed', () => {
    const cb = createCircuitBreaker();
    expect(cb.status).toBe('closed');
    expect(isCircuitOpen(cb)).toBe(false);
  });

  it('debe abrir después de fallas consecutivas', () => {
    const cb = createCircuitBreaker();
    
    for (let i = 0; i < 5; i++) {
      recordFailure(cb);
    }
    
    expect(cb.status).toBe('open');
    expect(isCircuitOpen(cb)).toBe(true);
  });

  it('debe cerrar después de suficientes éxitos en half-open', () => {
    const cb = createCircuitBreaker();
    
    cb.status = 'half-open';
    cb.lastFailureTime = Date.now() - CIRCUIT_BREAKER_CONFIG.timeoutMs;
    
    recordSuccess(cb);
    expect(cb.status).toBe('half-open');
    
    recordSuccess(cb);
    expect(cb.status).toBe('closed');
  });

  it('debe abrir en half-open tras una falla', () => {
    const cb = createCircuitBreaker();
    cb.status = 'half-open';
    
    recordFailure(cb);
    expect(cb.status).toBe('open');
  });

  it('debe permitir transición a half-open después del timeout', () => {
    const cb = createCircuitBreaker();
    cb.status = 'open';
    cb.lastFailureTime = Date.now() - CIRCUIT_BREAKER_CONFIG.timeoutMs - 1000;
    
    const isOpen = isCircuitOpen(cb);
    expect(isOpen).toBe(false);
    expect(cb.status).toBe('half-open');
  });

  it('no debe abrir con menos fallas que el umbral', () => {
    const cb = createCircuitBreaker();
    
    recordFailure(cb);
    recordFailure(cb);
    recordFailure(cb);
    
    expect(cb.status).toBe('closed');
  });
});

describe('Sanitize Tenant Slug', () => {
  const sanitizeTenantSlug = (slug: string): string => {
    return slug.replace(/[^a-zA-Z0-9_-]/g, '');
  };

  it('debe sanitizar slug válido', () => {
    expect(sanitizeTenantSlug('mi-restaurant')).toBe('mi-restaurant');
    expect(sanitizeTenantSlug('tienda_uno')).toBe('tienda_uno');
  });

  it('debe eliminar caracteres especiales', () => {
    expect(sanitizeTenantSlug('test@company!')).toBe('testcompany');
    expect(sanitizeTenantSlug('a;bcd')).toBe('abcd');
  });

  it('debe manejar espacios', () => {
    expect(sanitizeTenantSlug('mi restaurant')).toBe('mirestaurant');
  });
});

describe('Retry Logic', () => {
  const calculateDelay = (attempt: number, baseDelayMs: number, maxDelayMs: number): number => {
    const delay = baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * delay;
    return Math.min(delay + jitter, maxDelayMs);
  };

  it('debe incrementar delay exponencialmente', () => {
    const delay0 = calculateDelay(0, 1000, 10000);
    const delay1 = calculateDelay(1, 1000, 10000);
    const delay2 = calculateDelay(2, 1000, 10000);
    
    expect(delay1).toBeGreaterThan(delay0);
    expect(delay2).toBeGreaterThan(delay1);
  });

  it('debe no exceder maxDelayMs', () => {
    const delay = calculateDelay(10, 1000, 5000);
    expect(delay).toBeLessThanOrEqual(5000);
  });
});
