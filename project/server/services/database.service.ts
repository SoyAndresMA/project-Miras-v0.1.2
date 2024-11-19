import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { join } from 'path';
import { LoggerService } from '@/lib/services/logger.service';

interface QueryCacheEntry {
  timestamp: number;
  data: any;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private db: Database | null = null;
  private queryCache: Map<string, QueryCacheEntry> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  private readonly MAX_CACHE_SIZE = 100;
  private readonly logger = LoggerService.getInstance();
  private connectionPromise: Promise<Database> | null = null;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!this.instance) {
      this.instance = new DatabaseService();
    }
    return this.instance;
  }

  private async initializeDb(): Promise<Database> {
    const dbPath = join(process.cwd(), 'db/database.sqlite');
    
    this.logger.info('Initializing database connection', { dbPath });
    
    return await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
  }

  public async getConnection(): Promise<Database> {
    if (this.db) {
      return this.db;
    }

    if (this.connectionPromise) {
      return await this.connectionPromise;
    }

    try {
      this.connectionPromise = this.initializeDb();
      this.db = await this.connectionPromise;
      this.connectionPromise = null;
      return this.db;
    } catch (error) {
      this.connectionPromise = null;
      this.logger.error('Failed to initialize database connection', { error });
      throw error;
    }
  }

  public async closeConnection(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
    this.queryCache.clear();
  }

  private getCachedQuery(key: string): any | null {
    const cached = this.queryCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.queryCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCachedQuery(key: string, data: any): void {
    if (this.queryCache.size >= this.MAX_CACHE_SIZE) {
      // Eliminar la entrada más antigua
      const oldestKey = this.queryCache.keys().next().value;
      this.queryCache.delete(oldestKey);
    }

    this.queryCache.set(key, {
      timestamp: Date.now(),
      data
    });
  }

  public async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    const cacheKey = `${sql}-${JSON.stringify(params)}`;
    const cached = this.getCachedQuery(cacheKey);
    if (cached) return cached;

    const db = await this.getConnection();
    const result = await db.all(sql, params);
    
    this.setCachedQuery(cacheKey, result);
    return result;
  }

  public async execute(sql: string, params: any[] = []): Promise<void> {
    const db = await this.getConnection();
    await db.run(sql, params);
  }

  public async transaction<T>(callback: (db: Database) => Promise<T>): Promise<T> {
    const db = await this.getConnection();
    
    try {
      await db.run('BEGIN TRANSACTION');
      const result = await callback(db);
      await db.run('COMMIT');
      return result;
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  }
}
