import { getDb } from '@/app/api/db';
import { DeviceConfig } from '@/lib/types/device';

export class CasparServerRepository {
  static async getAllServers(): Promise<DeviceConfig[]> {
    const db = await getDb();
    const servers = await db.all('SELECT * FROM casparcg_servers ORDER BY name');
    
    // Convertir valores booleanos
    return servers.map(server => ({
      ...server,
      enabled: server.enabled === 1,
      is_shadow: server.is_shadow === 1
    }));
  }

  static async getServerById(id: string | number): Promise<DeviceConfig | null> {
    const db = await getDb();
    const server = await db.get(
      'SELECT * FROM casparcg_servers WHERE id = ?',
      id
    );

    if (!server) return null;

    return {
      ...server,
      enabled: server.enabled === 1,
      is_shadow: server.is_shadow === 1
    };
  }

  static async updateServerState(id: string | number, state: Partial<DeviceConfig>): Promise<void> {
    const db = await getDb();
    const updates: string[] = [];
    const values: any[] = [];

    Object.entries(state).forEach(([key, value]) => {
      if (key === 'enabled' || key === 'is_shadow') {
        updates.push(`${key} = ?`);
        values.push(value ? 1 : 0);
      } else {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });

    values.push(id);

    await db.run(
      `UPDATE casparcg_servers SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  }

  static async createServer(config: Omit<DeviceConfig, 'id'>): Promise<number> {
    const db = await getDb();
    const { lastID } = await db.run(
      `INSERT INTO casparcg_servers (
        name, host, port, description, username, password,
        preview_channel, locked_channel, is_shadow, enabled,
        command_timeout
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        config.name,
        config.host,
        config.port,
        config.description,
        config.username,
        config.password,
        config.preview_channel,
        config.locked_channel,
        config.is_shadow ? 1 : 0,
        config.enabled ? 1 : 0,
        config.command_timeout
      ]
    );

    return lastID;
  }

  static async deleteServer(id: string | number): Promise<void> {
    const db = await getDb();
    await db.run('DELETE FROM casparcg_servers WHERE id = ?', id);
  }
}
