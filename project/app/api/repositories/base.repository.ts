import { Database } from 'sqlite';
import { DatabaseService } from '@/server/services/database.service';

export abstract class BaseRepository<T> {
  protected dbService: DatabaseService;

  constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  protected async getDb(): Promise<Database> {
    return this.dbService.getConnection();
  }

  // Métodos CRUD base
  abstract findById(id: number): Promise<T | null>;
  abstract findAll(): Promise<T[]>;
  abstract create(data: Omit<T, 'id'>): Promise<T>;
  abstract update(id: number, data: Partial<T>): Promise<T>;
  abstract delete(id: number): Promise<void>;

  // Métodos de utilidad
  protected async transaction<R>(callback: (db: Database) => Promise<R>): Promise<R> {
    return this.dbService.transaction(callback);
  }
}
