import { invoke } from '@tauri-apps/api/core';

export type QueryResult<T = any> = {
  data?: T;
  lastInsertId?: string;
  rowsAffected: number;
};

export class Database {
  private transactionId?: string;

  async beginTransaction(): Promise<void> {
    if (this.transactionId) {
      throw new Error('Transaction already in progress');
    }
    this.transactionId = await invoke<string>('begin_transaction');
  }

  async executeQuery<T = any>(query: string, params: any[] = []): Promise<QueryResult<T>> {
    if (!this.transactionId) {
      throw new Error('No active transaction');
    }
    return await invoke<QueryResult<T>>('execute_query', {
      transactionId: this.transactionId,
      query,
      params
    });
  }

  async commit(): Promise<void> {
    if (!this.transactionId) {
      throw new Error('No active transaction');
    }
    await invoke<void>('commit_transaction', { transactionId: this.transactionId });
    this.transactionId = undefined;
  }

  async rollback(): Promise<void> {
    if (!this.transactionId) {
      throw new Error('No active transaction');
    }
    await invoke<void>('rollback_transaction', { transactionId: this.transactionId });
    this.transactionId = undefined;
  }

  async execute<T = any>(query: string, params: any[] = []): Promise<QueryResult<T>> {
    await this.beginTransaction();
    try {
      const result = await this.executeQuery(query, params);
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  async select<T = any[]>(query: string, params: any[] = []): Promise<T> {
    const result = await invoke<QueryResult<T>>('find_many', {
      transactionId: this.transactionId || null,
      query,
      params
    });
    return result.data as T;
  }

  async selectOne<T = any>(query: string, params: any[] = []): Promise<T> {
    const result = await invoke<QueryResult<T>>('find_one', {
      transactionId: this.transactionId || null,
      query,
      params
    });
    return (result.data || null) as T;
  }
}

export const initDatabase = async () => {
  return new Database();
};

/** Round a money value to 2 decimals (avoids float drift like 0.1 + 0.2). */
export const round2 = (value: number) => Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;

/**
 * Format a Date as UTC "YYYY-MM-DD HH:MM:SS", the format SQLite's CURRENT_TIMESTAMP
 * stores. Comparing against toISOString() ("...T...Z") is wrong because 'T' sorts
 * after ' ', which silently drops every row on the boundary day.
 */
export const toSqlUtc = (date: Date) => date.toISOString().replace("T", " ").slice(0, 19);
