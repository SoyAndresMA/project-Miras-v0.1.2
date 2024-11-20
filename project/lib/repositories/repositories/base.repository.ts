import { DatabaseService } from '@/server/services/database.service';
import { Database } from 'sqlite';
import { LoggerService } from '@/lib/services/logger.service';

export abstract class BaseRepository<T> {
  protected readonly dbService: DatabaseService;
  protected readonly logger: LoggerService;
  protected readonly context: string;

  constructor(context: string) {
    this.dbService = DatabaseService.getInstance();
    this.logger = LoggerService.create(context);
    this.context = context;
  }

  // Métodos CRUD base
  abstract findById(id: number): Promise<T | null>;
  abstract findAll(): Promise<T[]>;
  abstract create(data: Omit<T, 'id'>): Promise<T>;
  abstract update(id: number, data: Partial<T>): Promise<T>;
  abstract delete(id: number): Promise<void>;

  // Métodos de utilidad
  protected async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    this.logger.debug('Executing query', { sql, params });
    const db = await this.dbService.getConnection();
    return db.all<T>(sql, params);
  }

  protected async execute(sql: string, params: any[] = []): Promise<void> {
    this.logger.debug('Executing statement', { sql, params });
    const db = await this.dbService.getConnection();
    await db.run(sql, params);
  }

  protected async transaction<T>(callback: (db: Database) => Promise<T>): Promise<T> {
    this.logger.debug('Starting transaction');
    const db = await this.dbService.getConnection();
    return db.transaction(callback);
  }
}
