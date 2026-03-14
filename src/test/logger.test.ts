import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger, logCategories } from '@/lib/logger';

describe('Logger', () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('debe crear entrada de info', () => {
    logger.info('test message', { category: 'TEST' });
    expect(consoleInfoSpy).toHaveBeenCalled();
  });

  it('debe incluir timestamp en formato ISO', () => {
    logger.info('test');
    const output = consoleInfoSpy.mock.calls[0][0] as string;
    expect(output).toContain('[');
    expect(output).toContain(']');
  });

  it('debe incluir nivel de log', () => {
    logger.warn('warning test');
    const output = consoleWarnSpy.mock.calls[0][0] as string;
    expect(output).toContain('WARN');
  });

  it('debe incluir nivel error', () => {
    logger.error('error test');
    const output = consoleErrorSpy.mock.calls[0][0] as string;
    expect(output).toContain('ERROR');
  });
});

describe('logCategories', () => {
  it('debe tener categorías definidas', () => {
    expect(logCategories.SYNC).toBe('SYNC');
    expect(logCategories.AUTH).toBe('AUTH');
    expect(logCategories.INVENTORY).toBe('INVENTORY');
    expect(logCategories.SALES).toBe('SALES');
    expect(logCategories.DATABASE).toBe('DATABASE');
    expect(logCategories.UI).toBe('UI');
  });
});
