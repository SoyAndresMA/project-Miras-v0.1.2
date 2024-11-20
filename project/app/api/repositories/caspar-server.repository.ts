import { BaseRepository } from './base.repository';
import { DeviceConfig } from '@/lib/types/device';

interface ServerState {
  connected: boolean;
  lastError?: string | null;
  lastConnectionAttempt?: Date;
  lastSuccessfulConnection?: Date;
  lastErrorTime?: Date;
}

export class CasparServerRepository extends BaseRepository<DeviceConfig> {
  private static instance: CasparServerRepository;

  private constructor() {
    super('CasparServerRepository');
  }

  public static getInstance(): CasparServerRepository {
    if (!CasparServerRepository.instance) {
      CasparServerRepository.instance = new CasparServerRepository();
    }
    return CasparServerRepository.instance;
  }

  async findById(id: number): Promise<DeviceConfig | null> {
    this.logger.debug('Finding server by ID', { id });
    const servers = await this.query<DeviceConfig>(
      'SELECT * FROM casparcg_servers WHERE id = ?',
      [id]
    );
    return servers[0] || null;
  }

  async findAll(): Promise<DeviceConfig[]> {
    this.logger.debug('Finding all servers');
    return this.query<DeviceConfig>(
      'SELECT * FROM casparcg_servers ORDER BY name'
    );
  }

  async create(data: Omit<DeviceConfig, 'id'>): Promise<DeviceConfig> {
    this.logger.info('Creating new server', { data });
    return this.transaction(async (db) => {
      const { lastID } = await db.run(
        `INSERT INTO casparcg_servers (
          name, host, port, description,
          username, password, preview_channel,
          locked_channel, is_shadow, enabled,
          command_timeout
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.name,
          data.host,
          data.port,
          data.description || null,
          data.username || null,
          data.password || null,
          data.preview_channel || null,
          data.locked_channel || null,
          data.is_shadow || false,
          data.enabled !== undefined ? data.enabled : true,
          data.command_timeout || 5000
        ]
      );

      const server = await this.findById(lastID);
      if (!server) {
        throw new Error('Failed to create server');
      }
      return server;
    });
  }

  async update(id: number, data: Partial<DeviceConfig>): Promise<DeviceConfig> {
    this.logger.info('Updating server', { id, data });
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
        `UPDATE casparcg_servers SET ${setClauses.join(', ')} WHERE id = ?`,
        values
      );

      const server = await this.findById(id);
      if (!server) {
        throw new Error('Server not found after update');
      }
      return server;
    });
  }

  async delete(id: number): Promise<void> {
    this.logger.info('Deleting server', { id });
    await this.execute(
      'DELETE FROM casparcg_servers WHERE id = ?',
      [id]
    );
  }

  async updateServerState(serverId: string, state: ServerState): Promise<void> {
    return this.transaction(async (db) => {
      await db.run(`
        UPDATE casparcg_servers
        SET 
          connected = ?,
          last_error = ?,
          last_connection_attempt = ?,
          last_successful_connection = ?,
          last_error_time = ?
        WHERE id = ?
      `, [
        state.connected ? 1 : 0,
        state.lastError,
        state.lastConnectionAttempt?.toISOString(),
        state.lastSuccessfulConnection?.toISOString(),
        state.lastErrorTime?.toISOString(),
        serverId
      ]);
    });
  }

  private mapToDeviceConfig(row: any): DeviceConfig {
    return {
      id: row.id,
      name: row.name,
      host: row.host,
      port: row.port,
      description: row.description,
      username: row.username,
      password: row.password,
      preview_channel: row.preview_channel,
      locked_channel: row.locked_channel,
      is_shadow: Boolean(row.is_shadow),
      enabled: Boolean(row.enabled),
      command_timeout: row.command_timeout,
      connected: Boolean(row.connected),
      last_error: row.last_error,
      last_connection_attempt: row.last_connection_attempt ? new Date(row.last_connection_attempt) : undefined,
      last_successful_connection: row.last_successful_connection ? new Date(row.last_successful_connection) : undefined,
      last_error_time: row.last_error_time ? new Date(row.last_error_time) : undefined
    };
  }
}
