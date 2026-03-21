import { Table } from 'dexie';
import { db } from './index';
import { Ok, Err, Result, AppError } from '../types/result';
import { logger, logCategories } from '../logger';

class TransactionManagerClass {
  async transaction<T>(
    tables: Table[],
    callback: () => Promise<T>
  ): Promise<Result<T, AppError>> {
    try {
      const result = await db.transaction('rw', tables, async () => {
        return callback();
      });
      return Ok(result);
    } catch (error) {
      logger.error('Transaction failed', error instanceof Error ? error : undefined, {
        category: logCategories.DATABASE,
      });
      
      if (error instanceof AppError) {
        return Err(error);
      }
      
      return Err(
        new AppError(
          'Transaction failed',
          'TRANSACTION_ERROR',
          500,
          { originalError: error instanceof Error ? error.message : String(error) }
        )
      );
    }
  }
}

export const txManager = new TransactionManagerClass();
