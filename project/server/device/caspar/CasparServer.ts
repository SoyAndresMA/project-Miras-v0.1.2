import { DeviceManager } from '../DeviceManager';
import { CasparServerConfig, ConnectionOptions } from './types';
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
    super();
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
    CasparServer.instances.set(config.id, this);
  }

  static getInstance(id: number): CasparServer | undefined {
    return CasparServer.instances.get(id);
  }

  async connect(): Promise<boolean> {
    try {
      const connected = await this.connectionManager.connect();
      if (connected) {
        this.stateManager.startStatusUpdates();
        await this.initializeServerState();
      }
      return connected;
    } catch (error) {
      this.logger.error('Error al conectar:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.stateManager.stopStatusUpdates();
    this.commandManager.clearPendingCommands();
    await this.connectionManager.disconnect();
  }

  async sendCommand(command: string): Promise<any> {
    if (!this.connectionManager.isConnected()) {
      throw new Error('No conectado al servidor');
    }
    return this.commandManager.sendCommand(command);
  }

  getServerState(): any {
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
    } catch (error) {
      this.logger.error('Error al actualizar estado:', error);
    }
  }

  private processChannelInfo(info: string): void {
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
  }

  private parseChannels(info: string): any[] {
    return [];
  }
}
