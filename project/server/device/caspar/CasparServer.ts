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
      host: this.config.host,
      port: this.config.port,
      timeout: this.config.connection_timeout || 5000
    };

    this.connectionManager = new ConnectionManager(connectionOptions, this.logger);
    this.commandManager = new CommandManager(this.logger, this.config.connection_timeout);
    this.stateManager = new StateManager(this.logger);

    this.setupEventListeners();
  }

  static getInstance(config: CasparServerConfig): CasparServer {
    let server = CasparServer.instances.get(config.id);
    if (!server) {
      server = new CasparServer(config);
      CasparServer.instances.set(config.id, server);
    } else {
      // Actualizar la configuración si el servidor ya existe
      server.updateConfig(config);
    }
    return server;
  }

  updateConfig(config: CasparServerConfig): void {
    this.config = config;
    this.enabled = config.enabled;
    this.host = config.host;
    this.port = config.port;
    
    // Actualizar las opciones de conexión
    const connectionOptions: ConnectionOptions = {
      host: this.config.host,
      port: this.config.port,
      timeout: this.config.connection_timeout || 5000
    };
    
    this.connectionManager.updateOptions(connectionOptions);
  }

  static getState(serverId: number): Promise<ServerStateData> {
    const server = CasparServer.instances.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }
    return Promise.resolve(server.getServerState());
  }

  async initialize(): Promise<void> {
    if (this.enabled) {
      await this.connect();
    }
  }

  async connect(): Promise<boolean> {
    try {
      if (!this.enabled) {
        this.logger.warn('⚠️ Servidor deshabilitado, no se intentará la conexión');
        return false;
      }

      this.logger.info(`🔌 Intentando conectar a ${this.config.host}:${this.config.port}`);
      
      // Si ya está conectado, desconectar primero
      if (this.connected) {
        this.logger.info('⚠️ Ya conectado, desconectando primero...');
        await this.disconnect();
      }

      // Intentar conectar
      this.connected = await this.connectionManager.connect();
      
      if (this.connected) {
        this.logger.info('✅ Conexión establecida');
        
        // Verificar versión del servidor
        try {
          const versionResponse = await this.sendCommand('VERSION');
          this.stateManager.updateVersion(versionResponse.data);
          
          // Inicializar estado del servidor
          await this.initializeServerState();
          
          // Iniciar actualizaciones de estado
          this.stateManager.startStatusUpdates();
          
          return true;
        } catch (error) {
          this.logger.error('❌ Error al inicializar estado del servidor:', error);
          await this.disconnect();
          return false;
        }
      } else {
        this.logger.error('❌ No se pudo establecer conexión');
        return false;
      }
    } catch (error) {
      this.logger.error('❌ Error al conectar:', error);
      this.connected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.logger.info('🔌 Desconectando del servidor');
    this.stateManager.stopStatusUpdates();
    this.commandManager.clearPendingCommands();
    await this.connectionManager.disconnect();
    this.connected = false;
    this.logger.info('✅ Desconexión completada');
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
    return {
      ...this.stateManager.getState(),
      enabled: this.enabled,
      connected: this.connected
    };
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
      const infoResponse = await this.sendCommand('INFO');
      this.stateManager.updateChannels(infoResponse.data);
    } catch (error) {
      this.logger.error('Error al inicializar estado del servidor:', error);
      throw error;
    }
  }

  private async updateServerStatus(): Promise<void> {
    try {
      const infoResponse = await this.sendCommand('INFO');
      this.stateManager.updateChannels(infoResponse.data);
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
