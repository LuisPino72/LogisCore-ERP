import { logger, logCategories } from '@/lib/logger';

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors?: RegExp[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableErrors: [
    /network/i,
    /timeout/i,
    /econnrefused/i,
    /fetch failed/i,
    /503/i,
    /429/i,
    /ECONNRESET/i,
    /ETIMEDOUT/i,
  ],
};

const DEFAULT_CATEGORIES = logCategories.SYNC;

export function isRetryableError(error: unknown, config: RetryConfig = DEFAULT_RETRY_CONFIG): boolean {
  const errorStr = String(error).toLowerCase();
  return config.retryableErrors?.some((pattern) => pattern.test(errorStr)) ?? false;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  category: string = DEFAULT_CATEGORIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const shouldRetry = attempt < config.maxRetries - 1 && isRetryableError(error, config);

      if (!shouldRetry) {
        throw lastError;
      }

      const delay = calculateDelay(attempt, config);
      logger.warn(`Retrying ${operationName} in ${delay}ms`, {
        attempt: attempt + 1,
        maxRetries: config.maxRetries,
        error: lastError.message,
        category,
      });

      await sleep(delay);
    }
  }

  throw lastError;
}

function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * delay;
  return Math.min(delay + jitter, config.maxDelayMs);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createRetryOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  category?: string
): () => Promise<T> {
  return () => withRetry(operation, operationName, DEFAULT_RETRY_CONFIG, category);
}
