import { BaseRepository } from './base.repository';
import { MItem, CreateMItemInput } from '@/lib/types/item';
import { LoggerService } from '@/lib/services/logger.service';

export abstract class ItemRepository<T extends MItem, C extends CreateMItemInput> extends BaseRepository {
  protected abstract readonly context: string;
  protected abstract readonly tableName: string;
  protected readonly logger: LoggerService;

  constructor() {
    super();
    this.logger = LoggerService.create(this.context);
  }

  async findByEventId(eventId: number): Promise<T[]> {
    this.logger.debug('Fetching items by event ID', this.context, { eventId });
    return this.dbService.query<T[]>(
      `SELECT * FROM ${this.tableName} WHERE event_id = ? ORDER BY item_order`,
      [eventId],
      { cache: true, context: this.context }
    );
  }

  async findById(id: number): Promise<T | null> {
    this.logger.debug('Fetching item by ID', this.context, { id });
    const items = await this.dbService.query<T[]>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id],
      { cache: true, context: this.context }
    );
    return items[0] || null;
  }

  async create(input: C): Promise<T> {
    this.logger.info('Creating new item', this.context, { input });
    
    return this.dbService.transaction(async (db) => {
      // Get the highest order for the event
      const { max_order } = await db.get(
        `SELECT MAX(item_order) as max_order FROM ${this.tableName} WHERE event_id = ?`,
        input.event_id
      );
      
      const newOrder = (max_order || 0) + 1;

      const result = await this.performCreate(db, { ...input, item_order: newOrder });

      const item = await this.findById(result.lastID);
      if (!item) {
        const error = new Error('Failed to create item');
        this.logger.error('Item creation failed', error, this.context, { input });
        throw error;
      }

      this.logger.info('Item created successfully', this.context, { id: result.lastID });
      return item;
    }, this.context);
  }

  protected abstract performCreate(db: any, input: C & { item_order: number }): Promise<{ lastID: number }>;

  async updateOrder(id: number, newOrder: number): Promise<void> {
    this.logger.info('Updating item order', this.context, { id, newOrder });
    
    await this.dbService.transaction(async (db) => {
      const item = await this.findById(id);
      if (!item) {
        const error = new Error('Item not found');
        this.logger.error('Item order update failed', error, this.context, { id, newOrder });
        throw error;
      }

      await db.run(
        `UPDATE ${this.tableName} SET item_order = ? WHERE id = ?`,
        [newOrder, id]
      );

      this.logger.info('Item order updated successfully', this.context, { id, newOrder });
    }, this.context);
  }

  async updateUnion(id: number, unionId: number): Promise<T> {
    this.logger.info('Updating item union', this.context, { id, unionId });
    
    return this.dbService.transaction(async (db) => {
      const item = await this.findById(id);
      if (!item) {
        const error = new Error('Item not found');
        this.logger.error('Item union update failed', error, this.context, { id, unionId });
        throw error;
      }

      await db.run(
        `UPDATE ${this.tableName} SET item_union_id = ? WHERE id = ?`,
        [unionId, id]
      );

      const updatedItem = await this.findById(id);
      if (!updatedItem) {
        const error = new Error('Item not found after update');
        this.logger.error('Item union update failed', error, this.context, { id, unionId });
        throw error;
      }

      this.logger.info('Item union updated successfully', this.context, { id, unionId });
      return updatedItem;
    }, this.context);
  }

  async delete(id: number): Promise<void> {
    this.logger.info('Deleting item', this.context, { id });
    
    await this.dbService.transaction(async (db) => {
      const item = await this.findById(id);
      if (!item) {
        const error = new Error('Item not found');
        this.logger.error('Item deletion failed', error, this.context, { id });
        throw error;
      }

      await db.run(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);

      this.logger.info('Item deleted successfully', this.context, { id });
    }, this.context);
  }
}
