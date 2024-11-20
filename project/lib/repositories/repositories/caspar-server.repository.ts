'use server';

import { DatabaseService } from '@/server/services/database.service';
import { DeviceConfig } from '@/lib/types/device';
import { LoggerService } from '@/lib/services/logger.service';
import { ServerState } from '@/lib/types/server';

export class CasparServerRepository {
  private logger = LoggerService.getInstance();
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  async findAll(): Promise<DeviceConfig[]> {
    this.logger.debug('Finding all servers');
    return this.db.query<DeviceConfig>('SELECT * FROM casparcg_servers ORDER BY name');
  }

  async findById(id: number): Promise<DeviceConfig | null> {
    this.logger.debug('Finding server by ID', { id });
    const servers = await this.db.query<DeviceConfig>(
      'SELECT * FROM casparcg_servers WHERE id = ?',
      [id]
    );
    return servers[0] || null;
  }

  async create(data: Omit<DeviceConfig, 'id'>): Promise<DeviceConfig> {
    this.logger.info('Creating new server', { data });
    return this.db.transaction(async (db) => {
      const result = await db.run(
        `INSERT INTO casparcg_servers (
          name, host, port, channel_formats, version,
          connected, last_error, last_connection_attempt,
          last_successful_connection, last_error_time,
          description, username, password, preview_channel,
          locked_channel, is_shadow, enabled, command_timeout
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.name,
          data.host,
          data.port,
          data.channel_formats,
          data.version,
          data.connected ? 1 : 0,
          data.last_error,
          data.last_connection_attempt?.toISOString(),
          data.last_successful_connection?.toISOString(),
          data.last_error_time?.toISOString(),
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

      const server = await this.findById(result.lastID!);
      if (!server) {
        throw new Error('Server not found after creation');
      }
      return server;
    });
  }

  async update(id: number, data: Partial<DeviceConfig>): Promise<DeviceConfig> {
    this.logger.info('Updating server', { id, data });
    return this.db.transaction(async (db) => {
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

  async delete(id: string): Promise<void> {
    this.logger.info('Deleting server', { id });
    await this.db.execute('DELETE FROM casparcg_servers WHERE id = ?', [id]);
  }

  async updateServerState(serverId: string, state: ServerState): Promise<void> {
    this.logger.info('Updating server state', { serverId, state });
    await this.db.execute(
      `UPDATE casparcg_servers
       SET 
         connected = ?,
         last_error = ?,
         last_connection_attempt = ?,
         last_successful_connection = ?,
         last_error_time = ?
       WHERE id = ?`,
      [
        state.connected ? 1 : 0,
        state.lastError,
        state.lastConnectionAttempt?.toISOString(),
        state.lastSuccessfulConnection?.toISOString(),
        state.lastErrorTime?.toISOString(),
        serverId
      ]
    );
  }

  private mapToDeviceConfig(row: any): DeviceConfig {
    return {
      id: row.id,
      name: row.name,
      host: row.host,
      port: row.port,
      channel_formats: row.channel_formats,
      version: row.version,
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
