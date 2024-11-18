import { DeviceManager } from '@/server/device/DeviceManager';
import { CasparServerConfig, ConnectionOptions, ServerStateData } from './types';
import { ConnectionManager } from './connection/ConnectionManager';
import { CommandManager } from './connection/CommandManager';
import { StateManager } from './state/StateManager';
import { Logger } from './utils/Logger';
import { Channel } from './Channel';

export class CasparServer extends DeviceManager {
  private static instances: Map<number, CasparServer> = new Map();
  
  private logger: Logger;
  private connectionManager: ConnectionManager;
  private commandManager: CommandManager;
  private stateManager: StateManager;

  constructor(config: CasparServerConfig) {
    super(config);
    
    this.logger = new Logger(`CasparServer:${config.id}`);
    
    const connectionOptions: ConnectionOptions = {
      host: config.host,
      port: config.port,
      timeout: config.commandTimeout || 5000
    };

    this.connectionManager = new ConnectionManager(connectionOptions, this.logger);
    this.commandManager = new CommandManager(this.logger, config.commandTimeout);
    this.stateManager = new StateManager(this.logger);

    this.setupEventListeners();
  }

  static getInstance(config: CasparServerConfig): CasparServer {
    let server = CasparServer.instances.get(config.id);
    if (!server) {
      server = new CasparServer(config);
      CasparServer.instances.set(config.id, server);
    }
    return server;
  }

  static getState(serverId: number): Promise<ServerStateData> {
    const server = CasparServer.instances.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }
    return Promise.resolve(server.stateManager.getState());
  }

  async initialize(): Promise<void> {
    await this.connect();
  }

  async connect(): Promise<void> {
    try {
      this.connected = await this.connectionManager.connect();
      if (this.connected) {
        this.stateManager.startStatusUpdates();
        await this.initializeServerState();
      }
    } catch (error) {
      this.logger.error('Error al conectar:', error);
      this.connected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.stateManager.stopStatusUpdates();
    this.commandManager.clearPendingCommands();
    await this.connectionManager.disconnect();
    this.connected = false;
  }

  async sendCommand(command: string): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('No conectado al servidor');
    }

    // Asegurarse de que el comando está en mayúsculas y sin \r\n
    const normalizedCommand = command.trim().toUpperCase();
    
    return this.commandManager.sendCommand(normalizedCommand);
  }

  getServerState(): ServerStateData {
    return this.stateManager.getState();
  }

  private setupEventListeners(): void {
    this.connectionManager.on('data', (data: Buffer) => {
      this.commandManager.handleData(data);
    });

    this.commandManager.on('command', (command: string) => {
      const socket = this.connectionManager.getSocket();
      socket?.write(command);
    });

    this.stateManager.on('statusUpdate', async () => {
      try {
        await this.updateServerStatus();
      } catch (error) {
        this.logger.error('Error al actualizar estado:', error);
      }
    });
  }

  private async initializeServerState(): Promise<void> {
    try {
      const versionResponse = await this.sendCommand('VERSION');
      this.stateManager.setVersion(versionResponse.data);
      const infoResponse = await this.sendCommand('INFO');
      this.processChannelInfo(infoResponse.data);
    } catch (error) {
      this.logger.error('Error al inicializar estado:', error);
    }
  }

  private async updateServerStatus(): Promise<void> {
    try {
      const infoResponse = await this.sendCommand('INFO');
      this.processChannelInfo(infoResponse.data);
      this.stateManager.updateSuccess();
    } catch (error) {
      this.logger.error('Error al actualizar estado:', error);
      this.stateManager.updateFailed();
    }
  }

  private processChannelInfo(info: string): void {
    try {
      const channels = this.parseChannels(info);
      for (const channelData of channels) {
        const channel = new Channel(
          channelData.id,
          channelData.number,
          channelData.resolution,
          channelData.frameRate
        );
        this.stateManager.addChannel(channel);
      }
    } catch (error) {
      this.logger.error('Error al procesar información de canales:', error);
    }
  }

  private parseChannels(info: string): any[] {
    return this.commandManager.parseChannelInfo(info);
  }
}
