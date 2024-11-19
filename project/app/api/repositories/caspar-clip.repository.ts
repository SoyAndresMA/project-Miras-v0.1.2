import { ItemRepository } from './item.repository';
import { MCasparClip, CreateMCasparClipInput } from '@/lib/types/caspar-clip';

export class CasparClipRepository extends ItemRepository<MCasparClip, CreateMCasparClipInput> {
  private static instance: CasparClipRepository;
  protected readonly context = 'CasparClipRepository';
  protected readonly tableName = 'mcaspar_clips';

  private constructor() {
    super();
  }

  public static getInstance(): CasparClipRepository {
    if (!this.instance) {
      this.instance = new CasparClipRepository();
    }
    return this.instance;
  }

  protected async performCreate(db: any, input: CreateMCasparClipInput & { item_order: number }): Promise<{ lastID: number }> {
    return db.run(
      `INSERT INTO ${this.tableName} (
        event_id, 
        title, 
        item_order, 
        item_union_id,
        server_id,
        clip_path,
        in_point,
        out_point,
        duration,
        loop
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.event_id,
        input.title,
        input.item_order,
        input.item_union_id,
        input.server_id,
        input.clip_path,
        input.in_point || 0,
        input.out_point || null,
        input.duration || 0,
        input.loop || false
      ]
    );
  }

  async updateClipPath(id: number, clipPath: string): Promise<void> {
    this.logger.info('Updating clip path', this.context, { id, clipPath });
    
    await this.dbService.transaction(async (db) => {
      const clip = await this.findById(id);
      if (!clip) {
        const error = new Error('Clip not found');
        this.logger.error('Clip path update failed', error, this.context, { id, clipPath });
        throw error;
      }

      await db.run(
        `UPDATE ${this.tableName} SET clip_path = ? WHERE id = ?`,
        [clipPath, id]
      );

      this.logger.info('Clip path updated successfully', this.context, { id });
    }, this.context);
  }

  async updateInPoint(id: number, inPoint: number): Promise<void> {
    this.logger.info('Updating in point', this.context, { id, inPoint });
    
    await this.dbService.transaction(async (db) => {
      const clip = await this.findById(id);
      if (!clip) {
        const error = new Error('Clip not found');
        this.logger.error('In point update failed', error, this.context, { id, inPoint });
        throw error;
      }

      await db.run(
        `UPDATE ${this.tableName} SET in_point = ? WHERE id = ?`,
        [inPoint, id]
      );

      this.logger.info('In point updated successfully', this.context, { id });
    }, this.context);
  }

  async updateOutPoint(id: number, outPoint: number | null): Promise<void> {
    this.logger.info('Updating out point', this.context, { id, outPoint });
    
    await this.dbService.transaction(async (db) => {
      const clip = await this.findById(id);
      if (!clip) {
        const error = new Error('Clip not found');
        this.logger.error('Out point update failed', error, this.context, { id, outPoint });
        throw error;
      }

      await db.run(
        `UPDATE ${this.tableName} SET out_point = ? WHERE id = ?`,
        [outPoint, id]
      );

      this.logger.info('Out point updated successfully', this.context, { id });
    }, this.context);
  }

  async updateLoop(id: number, loop: boolean): Promise<void> {
    this.logger.info('Updating loop setting', this.context, { id, loop });
    
    await this.dbService.transaction(async (db) => {
      const clip = await this.findById(id);
      if (!clip) {
        const error = new Error('Clip not found');
        this.logger.error('Loop update failed', error, this.context, { id, loop });
        throw error;
      }

      await db.run(
        `UPDATE ${this.tableName} SET loop = ? WHERE id = ?`,
        [loop, id]
      );

      this.logger.info('Loop setting updated successfully', this.context, { id });
    }, this.context);
  }

  async updateDuration(id: number, duration: number): Promise<void> {
    this.logger.info('Updating duration', this.context, { id, duration });
    
    await this.dbService.transaction(async (db) => {
      const clip = await this.findById(id);
      if (!clip) {
        const error = new Error('Clip not found');
        this.logger.error('Duration update failed', error, this.context, { id, duration });
        throw error;
      }

      await db.run(
        `UPDATE ${this.tableName} SET duration = ? WHERE id = ?`,
        [duration, id]
      );

      this.logger.info('Duration updated successfully', this.context, { id });
    }, this.context);
  }
}
