import { BaseRepository } from './base.repository';
import { MEvent, CreateMEventInput } from '@/lib/types/event';
import { LoggerService } from '@/lib/services/logger.service';
import { DatabaseService } from '@/server/services/database.service';

export class EventRepository extends BaseRepository<MEvent> {
  private static instance: EventRepository;
  private readonly logger = LoggerService.getInstance();
  private readonly context = 'EventRepository';

  private constructor() {
    super(DatabaseService.getInstance());
  }

  public static getInstance(): EventRepository {
    if (!this.instance) {
      this.instance = new EventRepository();
    }
    return this.instance;
  }

  async findByProjectId(projectId: number): Promise<MEvent[]> {
    this.logger.debug('Fetching events by project ID', this.context, { projectId });
    const db = await this.getDb();
    return db.all(
      'SELECT * FROM mevents WHERE project_id = ? ORDER BY event_order',
      projectId
    );
  }

  async findById(id: number): Promise<MEvent | null> {
    this.logger.debug('Fetching event by ID', this.context, { id });
    const db = await this.getDb();
    const event = await db.get('SELECT * FROM mevents WHERE id = ?', id);
    return event || null;
  }

  async create(input: CreateMEventInput): Promise<MEvent> {
    this.logger.info('Creating new event', this.context, { input });
    
    return this.dbService.transaction(async (db) => {
      // Get the highest order for the project
      const { max_order } = await db.get(
        'SELECT MAX(event_order) as max_order FROM mevents WHERE project_id = ?',
        input.project_id
      );
      
      const newOrder = (max_order || 0) + 1;

      const { lastID } = await db.run(
        `INSERT INTO mevents (project_id, title, event_order, event_union_id) 
         VALUES (?, ?, ?, ?)`,
        [input.project_id, input.title, newOrder, input.event_union_id]
      );

      const event = await this.findById(lastID);
      if (!event) {
        const error = new Error('Failed to create event');
        this.logger.error('Event creation failed', error, this.context, { input });
        throw error;
      }

      this.logger.info('Event created successfully', this.context, { id: lastID });
      return event;
    }, this.context);
  }

  async updateOrder(id: number, newOrder: number): Promise<void> {
    this.logger.info('Updating event order', this.context, { id, newOrder });
    
    await this.dbService.transaction(async (db) => {
      const event = await this.findById(id);
      if (!event) {
        const error = new Error('Event not found');
        this.logger.error('Event order update failed', error, this.context, { id, newOrder });
        throw error;
      }

      await db.run(
        'UPDATE mevents SET event_order = ? WHERE id = ?',
        [newOrder, id]
      );

      this.logger.info('Event order updated successfully', this.context, { id, newOrder });
    }, this.context);
  }

  async updateUnion(id: number, unionId: number): Promise<MEvent> {
    this.logger.info('Updating event union', this.context, { id, unionId });
    
    return this.dbService.transaction(async (db) => {
      const event = await this.findById(id);
      if (!event) {
        const error = new Error('Event not found');
        this.logger.error('Event union update failed', error, this.context, { id, unionId });
        throw error;
      }

      await db.run(
        'UPDATE mevents SET event_union_id = ? WHERE id = ?',
        [unionId, id]
      );

      const updatedEvent = await db.get(`
        SELECT 
          e.*,
          u.name as union_name,
          u.icon as union_icon,
          u.description as union_description
        FROM mevents e
        LEFT JOIN mevent_unions u ON e.event_union_id = u.id
        WHERE e.id = ?
      `, id);

      if (!updatedEvent) {
        const error = new Error('Event not found after update');
        this.logger.error('Event union update failed', error, this.context, { id, unionId });
        throw error;
      }

      const result = {
        ...updatedEvent,
        munion: updatedEvent.union_name ? {
          id: updatedEvent.event_union_id,
          name: updatedEvent.union_name,
          icon: updatedEvent.union_icon,
          description: updatedEvent.union_description
        } : null
      };

      this.logger.info('Event union updated successfully', this.context, { id, unionId });
      return result;
    }, this.context);
  }

  async delete(id: number): Promise<void> {
    this.logger.info('Deleting event', this.context, { id });
    
    await this.dbService.transaction(async (db) => {
      const event = await this.findById(id);
      if (!event) {
        const error = new Error('Event not found');
        this.logger.error('Event deletion failed', error, this.context, { id });
        throw error;
      }

      // Delete the event and all its associated items
      await db.run('DELETE FROM mevents WHERE id = ?', [id]);

      this.logger.info('Event deleted successfully', this.context, { id });
    }, this.context);
  }
}
