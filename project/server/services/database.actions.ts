'use server';

import { DatabaseService } from './database.service';

export async function query<T>(sql: string, params: any[] = []): Promise<T[]> {
  const dbService = DatabaseService.getInstance();
  return dbService.query<T>(sql, params);
}

export async function execute(sql: string, params: any[] = []): Promise<void> {
  const dbService = DatabaseService.getInstance();
  return dbService.execute(sql, params);
}

export async function transaction<T>(
  callback: (db: any) => Promise<T>
): Promise<T> {
  const dbService = DatabaseService.getInstance();
  return dbService.transaction(callback);
}

export async function getConnection() {
  const dbService = DatabaseService.getInstance();
  return dbService.getConnection();
}
