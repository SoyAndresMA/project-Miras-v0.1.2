import { BaseRepository } from './base.repository';
import { MEventUnion, CreateMEventUnionInput } from '@/lib/types/event-union';
import { LoggerService } from '@/lib/services/logger.service';

export class EventUnionRepository extends BaseRepository {
  private static instance: EventUnionRepository;
  private readonly logger = LoggerService.getInstance();
  private readonly context = 'EventUnionRepository';

  private constructor() {
    super();
  }

  public static getInstance(): EventUnionRepository {
    if (!this.instance) {
      this.instance = new EventUnionRepository();
    }
    return this.instance;
  }

  async findAll(): Promise<MEventUnion[]> {
    this.logger.debug('Fetching all event unions', this.context);
    return this.dbService.query<MEventUnion[]>(
      'SELECT * FROM mevent_unions ORDER BY name',
      [],
      { cache: true, context: this.context }
    );
  }

  async findById(id: number): Promise<MEventUnion | null> {
    this.logger.debug('Fetching event union by ID', this.context, { id });
    const unions = await this.dbService.query<MEventUnion[]>(
      'SELECT * FROM mevent_unions WHERE id = ?',
      [id],
      { cache: true, context: this.context }
    );
    return unions[0] || null;
  }

  async create(input: CreateMEventUnionInput): Promise<MEventUnion> {
    this.logger.info('Creating new event union', this.context, { input });
    
    return this.dbService.transaction(async (db) => {
      const { lastID } = await db.run(
        `INSERT INTO mevent_unions (name, icon, description) 
         VALUES (?, ?, ?)`,
        [input.name, input.icon || null, input.description || null]
      );

      const union = await this.findById(lastID);
      if (!union) {
        const error = new Error('Failed to create event union');
        this.logger.error('Event union creation failed', error, this.context, { input });
        throw error;
      }

      this.logger.info('Event union created successfully', this.context, { id: lastID });
      return union;
    }, this.context);
  }

  async update(id: number, input: Partial<CreateMEventUnionInput>): Promise<MEventUnion> {
    this.logger.info('Updating event union', this.context, { id, input });
    
    return this.dbService.transaction(async (db) => {
      const union = await this.findById(id);
      if (!union) {
        const error = new Error('Event union not found');
        this.logger.error('Event union update failed', error, this.context, { id, input });
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
          `UPDATE mevent_unions SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      }

      const updatedUnion = await this.findById(id);
      if (!updatedUnion) {
        const error = new Error('Event union not found after update');
        this.logger.error('Event union update failed', error, this.context, { id, input });
        throw error;
      }

      this.logger.info('Event union updated successfully', this.context, { id });
      return updatedUnion;
    }, this.context);
  }

  async delete(id: number): Promise<void> {
    this.logger.info('Deleting event union', this.context, { id });
    
    await this.dbService.transaction(async (db) => {
      const union = await this.findById(id);
      if (!union) {
        const error = new Error('Event union not found');
        this.logger.error('Event union deletion failed', error, this.context, { id });
        throw error;
      }

      // First update all events that use this union to null
      await db.run(
        'UPDATE mevents SET event_union_id = NULL WHERE event_union_id = ?',
        [id]
      );

      // Then delete the union
      await db.run('DELETE FROM mevent_unions WHERE id = ?', [id]);

      this.logger.info('Event union deleted successfully', this.context, { id });
    }, this.context);
  }
}
