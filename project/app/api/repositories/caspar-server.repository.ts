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
  async findById(id: number): Promise<DeviceConfig | null> {
    const db = await this.getDb();
    const server = await db.get(
      'SELECT * FROM casparcg_servers WHERE id = ?',
      id
    );

    if (!server) return null;

    return this.mapToDeviceConfig(server);
  }

  async findAll(): Promise<DeviceConfig[]> {
    const db = await this.getDb();
    const servers = await db.all(
      'SELECT * FROM casparcg_servers ORDER BY name'
    );

    return servers.map(this.mapToDeviceConfig);
  }

  async create(data: Omit<DeviceConfig, 'id'>): Promise<DeviceConfig> {
    return this.transaction(async (db) => {
      const { lastID } = await db.run(`
        INSERT INTO casparcg_servers (
          name, host, port, description,
          username, password, preview_channel,
          locked_channel, is_shadow, enabled,
          command_timeout
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.name,
        data.host,
        data.port,
        data.description || null,
        data.username || null,
        data.password || null,
        data.preview_channel || null,
        data.locked_channel || null,
        data.is_shadow ? 1 : 0,
        data.enabled ? 1 : 0,
        data.command_timeout || 5000
      ]);

      const server = await this.findById(lastID);
      if (!server) throw new Error('Failed to create server');
      return server;
    });
  }

  async update(id: number, data: Partial<DeviceConfig>): Promise<DeviceConfig> {
    return this.transaction(async (db) => {
      const currentServer = await this.findById(id);
      if (!currentServer) throw new Error('Server not found');

      const updates = [];
      const values = [];

      if (data.name !== undefined) {
        updates.push('name = ?');
        values.push(data.name);
      }
      if (data.host !== undefined) {
        updates.push('host = ?');
        values.push(data.host);
      }
      if (data.port !== undefined) {
        updates.push('port = ?');
        values.push(data.port);
      }
      if (data.description !== undefined) {
        updates.push('description = ?');
        values.push(data.description);
      }
      if (data.username !== undefined) {
        updates.push('username = ?');
        values.push(data.username);
      }
      if (data.password !== undefined) {
        updates.push('password = ?');
        values.push(data.password);
      }
      if (data.preview_channel !== undefined) {
        updates.push('preview_channel = ?');
        values.push(data.preview_channel);
      }
      if (data.locked_channel !== undefined) {
        updates.push('locked_channel = ?');
        values.push(data.locked_channel);
      }
      if (data.is_shadow !== undefined) {
        updates.push('is_shadow = ?');
        values.push(data.is_shadow ? 1 : 0);
      }
      if (data.enabled !== undefined) {
        updates.push('enabled = ?');
        values.push(data.enabled ? 1 : 0);
      }
      if (data.command_timeout !== undefined) {
        updates.push('command_timeout = ?');
        values.push(data.command_timeout);
      }

      if (updates.length > 0) {
        await db.run(`
          UPDATE casparcg_servers
          SET ${updates.join(', ')}
          WHERE id = ?
        `, [...values, id]);
      }

      const updatedServer = await this.findById(id);
      if (!updatedServer) throw new Error('Server not found after update');
      return updatedServer;
    });
  }

  async delete(id: number): Promise<void> {
    return this.transaction(async (db) => {
      await db.run('DELETE FROM casparcg_servers WHERE id = ?', id);
    });
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
