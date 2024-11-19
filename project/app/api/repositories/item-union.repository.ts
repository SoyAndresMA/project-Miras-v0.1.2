import { BaseRepository } from './base.repository';
import { MItemUnion, CreateMItemUnionInput } from '@/lib/types/item-union';
import { LoggerService } from '@/lib/services/logger.service';

export class ItemUnionRepository extends BaseRepository {
  private static instance: ItemUnionRepository;
  private readonly logger = LoggerService.getInstance();
  private readonly context = 'ItemUnionRepository';

  private constructor() {
    super();
  }

  public static getInstance(): ItemUnionRepository {
    if (!this.instance) {
      this.instance = new ItemUnionRepository();
    }
    return this.instance;
  }

  async findAll(): Promise<MItemUnion[]> {
    this.logger.debug('Fetching all item unions', this.context);
    return this.dbService.query<MItemUnion[]>(
      'SELECT * FROM mitem_unions ORDER BY name',
      [],
      { cache: true, context: this.context }
    );
  }

  async findById(id: number): Promise<MItemUnion | null> {
    this.logger.debug('Fetching item union by ID', this.context, { id });
    const unions = await this.dbService.query<MItemUnion[]>(
      'SELECT * FROM mitem_unions WHERE id = ?',
      [id],
      { cache: true, context: this.context }
    );
    return unions[0] || null;
  }

  async create(input: CreateMItemUnionInput): Promise<MItemUnion> {
    this.logger.info('Creating new item union', this.context, { input });
    
    return this.dbService.transaction(async (db) => {
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

  async update(id: number, input: Partial<CreateMItemUnionInput>): Promise<MItemUnion> {
    this.logger.info('Updating item union', this.context, { id, input });
    
    return this.dbService.transaction(async (db) => {
      const union = await this.findById(id);
      if (!union) {
        const error = new Error('Item union not found');
        this.logger.error('Item union update failed', error, this.context, { id, input });
        throw error;
      }

      const updates: string[] = [];
      const values: any[] = [];

      if (input.name !== undefined) {
        updates.push('name = ?');
        values.push(input.name);
      }
      if (input.icon !== undefined) {
        updates.push('icon = ?');
        values.push(input.icon);
      }
      if (input.description !== undefined) {
        updates.push('description = ?');
        values.push(input.description);
      }

      if (updates.length > 0) {
        values.push(id);
        await db.run(
          `UPDATE mitem_unions SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      }

      const updatedUnion = await this.findById(id);
      if (!updatedUnion) {
        const error = new Error('Item union not found after update');
        this.logger.error('Item union update failed', error, this.context, { id, input });
        throw error;
      }

      this.logger.info('Item union updated successfully', this.context, { id });
      return updatedUnion;
    }, this.context);
  }

  async delete(id: number): Promise<void> {
    this.logger.info('Deleting item union', this.context, { id });
    
    await this.dbService.transaction(async (db) => {
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
