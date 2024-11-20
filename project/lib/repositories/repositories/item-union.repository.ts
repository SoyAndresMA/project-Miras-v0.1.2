import { BaseRepository } from './base.repository';
import { MItemUnion, CreateMItemUnionInput } from '@/lib/types/item-union';
import { LoggerService } from '@/lib/services/logger.service';

export class ItemUnionRepository extends BaseRepository<MItemUnion> {
  private readonly logger = LoggerService.getInstance();
  private readonly context = 'ItemUnionRepository';

  constructor() {
    super('ItemUnionRepository');
  }

  async findAll(): Promise<MItemUnion[]> {
    this.logger.debug('Fetching all item unions', this.context);
    return this.query<MItemUnion>(
      'SELECT * FROM mitem_unions ORDER BY name',
      [],
      { cache: true, context: this.context }
    );
  }

  async findById(id: number): Promise<MItemUnion | null> {
    this.logger.debug('Fetching item union by ID', this.context, { id });
    const unions = await this.query<MItemUnion>(
      'SELECT * FROM mitem_unions WHERE id = ?',
      [id],
      { cache: true, context: this.context }
    );
    return unions[0] || null;
  }

  async create(input: CreateMItemUnionInput): Promise<MItemUnion> {
    this.logger.info('Creating new item union', this.context, { input });
    
    return this.transaction(async (db) => {
      const { lastID } = await db.run(
        `INSERT INTO mitem_unions (name, icon, description) 
         VALUES (?, ?, ?)`,
        [input.name, input.icon || null, input.description || null]
      );

      const union = await this.findById(lastID);
      if (!union) {
        const error = new Error('Failed to create item union');
        this.logger.error('Item union creation failed', error, this.context, { input });
        throw error;
      }

      this.logger.info('Item union created successfully', this.context, { id: lastID });
      return union;
    }, this.context);
  }

  async update(id: number, data: Partial<MItemUnion>): Promise<MItemUnion> {
    this.logger.info('Updating item union', this.context, { id, data });
    
    return this.transaction(async (db) => {
      const setClauses: string[] = [];
      const values: any[] = [];

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          setClauses.push(`${key} = ?`);
          values.push(value);
        }
      });

      if (setClauses.length === 0) {
        return (await this.findById(id))!;
      }

      values.push(id);
      await db.run(
        `UPDATE mitem_unions SET ${setClauses.join(', ')} WHERE id = ?`,
        values
      );

      const union = await this.findById(id);
      if (!union) {
        const error = new Error('Item union not found after update');
        this.logger.error('Item union update failed', error, this.context, { id, data });
        throw error;
      }

      this.logger.info('Item union updated successfully', this.context, { id });
      return union;
    }, this.context);
  }

  async delete(id: number): Promise<void> {
    this.logger.info('Deleting item union', this.context, { id });
    
    await this.transaction(async (db) => {
      const union = await this.findById(id);
      if (!union) {
        const error = new Error('Item union not found');
        this.logger.error('Item union deletion failed', error, this.context, { id });
        throw error;
      }

      // First update all items that use this union to null
      await db.run(
        'UPDATE mitems SET item_union_id = NULL WHERE item_union_id = ?',
        [id]
      );

      // Then delete the union
      await db.run('DELETE FROM mitem_unions WHERE id = ?', [id]);

      this.logger.info('Item union deleted successfully', this.context, { id });
    }, this.context);
  }
}
