import { Database } from 'sqlite';
import { CasparClip } from '../types/item';
import { BaseRepository } from './BaseRepository';

export class CasparClipRepository implements BaseRepository<CasparClip> {
  constructor(private db: Database) {}

  async findById(id: number): Promise<CasparClip | null> {
    const clip = await this.db.get(`
      SELECT c.*, p.position_row, p.position_column
      FROM caspar_clips c
      LEFT JOIN item_positions p ON p.item_id = c.id AND p.item_type = 'casparClip'
      WHERE c.id = ?
    `, [id]);

    return clip ? this.mapToEntity(clip) : null;
  }

  async findByEventId(eventId: number): Promise<CasparClip[]> {
    const clips = await this.db.all(`
      SELECT c.*, p.position_row, p.position_column
      FROM caspar_clips c
      LEFT JOIN item_positions p ON p.item_id = c.id AND p.item_type = 'casparClip'
      WHERE c.event_id = ?
    `, [eventId]);

    return clips.map(this.mapToEntity);
  }

  async create(item: Omit<CasparClip, 'id'>): Promise<CasparClip> {
    const result = await this.db.run(`
      INSERT INTO caspar_clips (
        event_id, name, file_path, channel, layer, 
        loop, auto_start, transition_type, transition_duration
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      item.eventId,
      item.name,
      item.filePath,
      item.channel,
      item.layer,
      item.loop,
      item.autoStart,
      item.transition?.type,
      item.transition?.duration
    ]);

    if (item.position) {
      await this.db.run(`
        INSERT INTO item_positions (
          event_id, item_type, item_id, position_row, position_column
        ) VALUES (?, 'casparClip', ?, ?, ?)
      `, [item.eventId, result.lastID, item.position.row, item.position.column]);
    }

    return this.findById(result.lastID!);
  }

  async update(id: number, item: Partial<CasparClip>): Promise<CasparClip> {
    const sets: string[] = [];
    const params: any[] = [];

    if (item.name) {
      sets.push('name = ?');
      params.push(item.name);
    }
    if (item.filePath) {
      sets.push('file_path = ?');
      params.push(item.filePath);
    }
    if (item.channel !== undefined) {
      sets.push('channel = ?');
      params.push(item.channel);
    }
    if (item.layer !== undefined) {
      sets.push('layer = ?');
      params.push(item.layer);
    }
    if (item.loop !== undefined) {
      sets.push('loop = ?');
      params.push(item.loop);
    }
    if (item.autoStart !== undefined) {
      sets.push('auto_start = ?');
      params.push(item.autoStart);
    }
    if (item.transition) {
      sets.push('transition_type = ?, transition_duration = ?');
      params.push(item.transition.type, item.transition.duration);
    }

    if (sets.length > 0) {
      params.push(id);
      await this.db.run(`
        UPDATE caspar_clips 
        SET ${sets.join(', ')}
        WHERE id = ?
      `, params);
    }

    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await this.db.run('DELETE FROM item_positions WHERE item_id = ? AND item_type = ?', [id, 'casparClip']);
    await this.db.run('DELETE FROM caspar_clips WHERE id = ?', [id]);
  }

  async updatePosition(id: number, row: number, column: number): Promise<void> {
    const clip = await this.findById(id);
    if (!clip) throw new Error('Clip not found');

    await this.db.run(`
      INSERT OR REPLACE INTO item_positions (
        event_id, item_type, item_id, position_row, position_column
      ) VALUES (?, 'casparClip', ?, ?, ?)
    `, [clip.eventId, id, row, column]);
  }

  async getPosition(id: number): Promise<{ row: number; column: number } | null> {
    const pos = await this.db.get(`
      SELECT position_row as row, position_column as column
      FROM item_positions
      WHERE item_id = ? AND item_type = 'casparClip'
    `, [id]);

    return pos || null;
  }

  private mapToEntity(row: any): CasparClip {
    return {
      id: row.id,
      type: 'casparClip',
      eventId: row.event_id,
      name: row.name,
      filePath: row.file_path,
      channel: row.channel,
      layer: row.layer,
      loop: Boolean(row.loop),
      autoStart: Boolean(row.auto_start),
      position: row.position_row !== null ? {
        row: row.position_row,
        column: row.position_column
      } : undefined,
      transition: row.transition_type ? {
        type: row.transition_type,
        duration: row.transition_duration
      } : undefined
    };
  }
}
