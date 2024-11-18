import { DeviceConfig } from '@/lib/types/device';
import { CasparServer } from '@/server/device/CasparServer';
import EventBus from '@/lib/events/EventBus';

class ServerManager {
  private static instance: ServerManager;
  private servers: Map<number, CasparServer> = new Map();
  private serverConfigs: DeviceConfig[] = [];

  private constructor() {
    // Initialize servers when the app starts
    this.initialize();
  }

  public static getInstance(): ServerManager {
    if (!ServerManager.instance) {
      ServerManager.instance = new ServerManager();
    }
    return ServerManager.instance;
  }

  async initialize() {
    try {
      const response = await fetch('/api/casparcg/servers');
      const servers = await response.json();
      this.serverConfigs = servers;

      // Only try to connect to enabled servers
      for (const config of servers.filter(s => s.enabled)) {
        const server = CasparServer.getInstance({
          id: config.id,
          name: config.name,
          host: config.host,
          port: config.port,
          enabled: true
        });

        try {
          await server.connect();
          config.connected = true;
          
          // Update server status via API
          await fetch(`/api/casparcg/servers/${config.id}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ connected: true })
          });

          // Emit server connection event
          EventBus.emit({
            type: 'SERVER_STATUS',
            serverId: config.id,
            connected: true
          });
        } catch (error) {
          console.error(`Failed to connect to server ${config.name}:`, error);
          config.connected = false;
          
          EventBus.emit({
            type: 'SERVER_STATUS',
            serverId: config.id,
            connected: false,
            error: error.message
          });
        }

        this.servers.set(config.id, server);
      }
    } catch (error) {
      console.error('Error initializing servers:', error);
    }
  }

  getServerConfigs(): DeviceConfig[] {
    return this.serverConfigs;
  }

  getServer(id: number): CasparServer | undefined {
    return this.servers.get(id);
  }

  async updateServerConfig(config: DeviceConfig) {
    const index = this.serverConfigs.findIndex(s => s.id === config.id);
    if (index !== -1) {
      this.serverConfigs[index] = config;
    }
  }
}

export default ServerManager.getInstance();