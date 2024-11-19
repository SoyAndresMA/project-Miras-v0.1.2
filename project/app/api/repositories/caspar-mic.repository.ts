import { ItemRepository } from './item.repository';
import { MCasparMic, CreateMCasparMicInput } from '@/lib/types/caspar-mic';

export class CasparMicRepository extends ItemRepository<MCasparMic, CreateMCasparMicInput> {
  private static instance: CasparMicRepository;
  protected readonly context = 'CasparMicRepository';
  protected readonly tableName = 'mcaspar_mics';

  private constructor() {
    super();
  }

  public static getInstance(): CasparMicRepository {
    if (!this.instance) {
      this.instance = new CasparMicRepository();
    }
    return this.instance;
  }

  protected async performCreate(db: any, input: CreateMCasparMicInput & { item_order: number }): Promise<{ lastID: number }> {
    return db.run(
      `INSERT INTO ${this.tableName} (
        event_id, 
        title, 
        item_order, 
        item_union_id,
        server_id,
        device_number,
        channel,
        volume,
        muted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.event_id,
        input.title,
        input.item_order,
        input.item_union_id,
        input.server_id,
        input.device_number,
        input.channel || 1,
        input.volume || 1,
        input.muted || false
      ]
    );
  }

  async updateDeviceNumber(id: number, deviceNumber: number): Promise<void> {
    this.logger.info('Updating device number', this.context, { id, deviceNumber });
    
    await this.dbService.transaction(async (db) => {
      const mic = await this.findById(id);
      if (!mic) {
        const error = new Error('Mic not found');
        this.logger.error('Device number update failed', error, this.context, { id, deviceNumber });
        throw error;
      }

      await db.run(
        `UPDATE ${this.tableName} SET device_number = ? WHERE id = ?`,
        [deviceNumber, id]
      );

      this.logger.info('Device number updated successfully', this.context, { id });
    }, this.context);
  }

  async updateChannel(id: number, channel: number): Promise<void> {
    this.logger.info('Updating channel', this.context, { id, channel });
    
    await this.dbService.transaction(async (db) => {
      const mic = await this.findById(id);
      if (!mic) {
        const error = new Error('Mic not found');
        this.logger.error('Channel update failed', error, this.context, { id, channel });
        throw error;
      }

      await db.run(
        `UPDATE ${this.tableName} SET channel = ? WHERE id = ?`,
        [channel, id]
      );

      this.logger.info('Channel updated successfully', this.context, { id });
    }, this.context);
  }

  async updateVolume(id: number, volume: number): Promise<void> {
    this.logger.info('Updating volume', this.context, { id, volume });
    
    await this.dbService.transaction(async (db) => {
      const mic = await this.findById(id);
      if (!mic) {
        const error = new Error('Mic not found');
        this.logger.error('Volume update failed', error, this.context, { id, volume });
        throw error;
      }

      await db.run(
        `UPDATE ${this.tableName} SET volume = ? WHERE id = ?`,
        [volume, id]
      );

      this.logger.info('Volume updated successfully', this.context, { id });
    }, this.context);
  }

  async updateMuted(id: number, muted: boolean): Promise<void> {
    this.logger.info('Updating muted state', this.context, { id, muted });
    
    await this.dbService.transaction(async (db) => {
      const mic = await this.findById(id);
      if (!mic) {
        const error = new Error('Mic not found');
        this.logger.error('Muted state update failed', error, this.context, { id, muted });
        throw error;
      }

      await db.run(
        `UPDATE ${this.tableName} SET muted = ? WHERE id = ?`,
        [muted, id]
      );

      this.logger.info('Muted state updated successfully', this.context, { id });
    }, this.context);
  }
}
