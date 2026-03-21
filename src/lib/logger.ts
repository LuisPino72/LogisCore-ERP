type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;

  private formatEntry(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    };
  }

  private output(entry: LogEntry): void {
    if (!this.isDevelopment && (entry.level === 'debug' || entry.level === 'info')) return;

    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    
    switch (entry.level) {
      case 'error':
        console.error(prefix, entry.message, entry.context || '', entry.error || '');
        break;
      case 'warn':
        console.warn(prefix, entry.message, entry.context || '');
        break;
      case 'info':
      case 'debug':
      default:
        console.info(prefix, entry.message, entry.context || '');
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.output(this.formatEntry('debug', message, context));
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.output(this.formatEntry('info', message, context));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.output(this.formatEntry('warn', message, context));
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.output(this.formatEntry('error', message, context, error));
  }
}

export const logger = new Logger();

export const logCategories = {
  SYNC: 'SYNC',
  AUTH: 'AUTH',
  INVENTORY: 'INVENTORY',
  SALES: 'SALES',
  DATABASE: 'DATABASE',
  UI: 'UI',
  ACCOUNTING: 'ACCOUNTING',
  INVOICING: 'INVOICING',
} as const;
