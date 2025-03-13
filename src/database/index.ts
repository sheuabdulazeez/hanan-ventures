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
    const result = await invoke<QueryResult<T>>('find_many', { query, params });
    return result.data;
  }

  async selectOne<T = any>(query: string, params: any[] = []): Promise<T> {
    const result = await invoke<QueryResult<T>>('find_one', { query, params });
    return result.data || null;
  }
}

export const initDatabase = async () => {
  return new Database();
};