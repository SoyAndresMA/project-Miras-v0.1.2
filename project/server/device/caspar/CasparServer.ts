import { DeviceManager } from '@/server/device/DeviceManager';
import { CasparServerConfig, ConnectionOptions, ServerStateData } from './types';
import { ConnectionManager } from './connection/ConnectionManager';
import { CommandManager } from './connection/CommandManager';
import { StateManager } from './state/StateManager';
import { Logger } from './utils/Logger';
import { Channel } from './Channel';

// Interfaces
interface PlayOptions {
  channel: number;
  layer: number;
  file: string;
  loop?: boolean;
  transition?: {
    type: string;
    duration: number;
  };
}

export class CasparServer extends DeviceManager {
  private static instances: Map<number, CasparServer> = new Map();
  
  private logger: Logger;
  private connectionManager: ConnectionManager;
  private commandManager: CommandManager;
  private stateManager: StateManager;
  private connected = false;

  constructor(config: CasparServerConfig) {
    super(config);
    
    this.logger = new Logger(`CasparServer:${this.id}`);
    
    const connectionOptions: ConnectionOptions = {
      host: this.host,
      port: this.port,
      timeout: config.connection_timeout || 10000
    };

    // Primero crear el CommandManager
    this.commandManager = new CommandManager(this.logger, config.connection_timeout || 10000);
    
    // Luego crear el ConnectionManager pasándole el CommandManager
    this.connectionManager = new ConnectionManager(
      this.logger,
      connectionOptions,
      this.commandManager
    );
    
    this.stateManager = new StateManager(this.logger);

    this.setupEventListeners();
  }

  static async getInstance(config: CasparServerConfig): Promise<CasparServer> {
    if (!config || typeof config.id !== 'number') {
      throw new Error('Invalid server configuration: missing or invalid id');
    }

    let server = CasparServer.instances.get(config.id);
    if (!server) {
      server = new CasparServer(config);
      CasparServer.instances.set(config.id, server);
    } else {
      // Actualizar la configuración si el servidor ya existe
      await server.updateConfig(config);
    }
    return server;
  }

  async updateConfig(config: CasparServerConfig): Promise<void> {
    this.id = config.id;
    this.name = config.name;
    this.host = config.host;
    this.port = config.port;
    this.enabled = config.enabled;
    
    // Actualizar las opciones de conexión
    const connectionOptions: ConnectionOptions = {
      host: this.host,
      port: this.port,
      timeout: config.connection_timeout || 10000
    };
    
    await this.connectionManager.updateOptions(connectionOptions);
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

  isConnected(): boolean {
    return this.connected && this.connectionManager.isConnected();
  }

  async connect(): Promise<boolean> {
    this.logger.info(`🔄 Iniciando conexión al servidor ${this.name}...`);
    
    if (this.isConnected()) {
      this.logger.info('✅ Ya conectado al servidor');
      return true;
    }

    try {
      this.logger.info(`📡 Intentando conectar a ${this.host}:${this.port}...`);
      const connected = await this.connectionManager.connect();
      
      if (connected) {
        this.logger.info('✅ Conexión establecida exitosamente');
        this.setConnected(true);

        // Enviar VERSION sin esperar respuesta
        this.logger.info('📤 Enviando comando VERSION (sin esperar respuesta)...');
        this.sendCommand('VERSION').catch(error => {
          this.logger.warn('⚠️ No se pudo obtener VERSION, pero continuamos:', error);
        });

        return true;
      } else {
        this.logger.error('❌ No se pudo establecer la conexión');
        this.setConnected(false);
        return false;
      }
    } catch (error) {
      this.logger.error('❌ Error durante la conexión:', error);
      this.setConnected(false);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.logger.info('🔄 Desconectando servidor...');
    
    if (!this.isConnected()) {
      this.logger.info('ℹ️ El servidor ya está desconectado');
      return;
    }

    try {
      await this.connectionManager.disconnect();
      this.setConnected(false);
      this.logger.info('✅ Servidor desconectado exitosamente');
    } catch (error) {
      this.logger.error('❌ Error al desconectar:', error);
      throw error;
    }
  }

  async sendCommand(command: string): Promise<any> {
    this.logger.info(`📤 Enviando comando: ${command}`);
    
    if (!this.isConnected()) {
      this.logger.error('❌ No se puede enviar el comando: servidor no conectado');
      throw new Error('Server not connected');
    }

    try {
      const response = await this.commandManager.sendCommand(command);
      this.logger.info(`✅ Respuesta recibida:`, response);
      return response;
    } catch (error) {
      this.logger.error('❌ Error al enviar comando:', error);
      throw error;
    }
  }

  getServerState(): ServerStateData {
    return {
      id: this.id,
      name: this.name,
      host: this.host,
      port: this.port,
      enabled: this.enabled,
      connected: this.isConnected(),
      ...this.stateManager.getState()
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

  private async updateServerStatus(): Promise<void> {
    try {
      const infoResponse = await this.sendCommand('INFO');
      await this.parseInfoResponse(infoResponse);
      this.stateManager.updateSuccess();
    } catch (error) {
      this.logger.error('Error al actualizar estado:', error);
      this.stateManager.updateFailed();
    }
  }

  private parseVersionResponse(response: string): string {
    // Formato esperado:
    // 201 VERSION OK
    // 2.1.0.f207a33 STABLE
    const lines = response.split('\r\n');
    if (lines.length >= 2) {
      return lines[1].trim();
    }
    return 'unknown';
  }

  private async parseInfoResponse(response: string): Promise<void> {
    // Formato esperado:
    // 200 INFO OK
    // 1 720p5000 PLAYING
    // 2 PAL PLAYING
    const lines = response.split('\r\n');
    const channels: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        const [channelNumber, ...rest] = line.split(' ');
        const channelInfo = {
          number: parseInt(channelNumber),
          format: rest[0],
          status: rest[1] || 'UNKNOWN'
        };
        channels.push(channelInfo);
        this.logger.info(`📺 Canal ${channelInfo.number}: ${channelInfo.format} (${channelInfo.status})`);
      }
    }

    this.stateManager.updateChannels(channels);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async play(options: PlayOptions): Promise<void> {
    this.logger.info('🎬 Iniciando reproducción de clip', options);
    
    if (!this.isConnected()) {
      throw new Error('Server not connected');
    }

    try {
      // Construir comando PLAY
      let command = `PLAY ${options.channel}-${options.layer} "${options.file}"`;
      
      // Agregar opciones de loop si está especificado
      if (options.loop) {
        command += ' LOOP';
      }

      // Agregar transición si está especificada
      if (options.transition) {
        command += ` ${options.transition.type} ${options.transition.duration}`;
      }

      await this.sendCommand(command);
      this.logger.info('✅ Clip iniciado exitosamente');
    } catch (error) {
      this.logger.error('❌ Error al reproducir clip:', error);
      throw error;
    }
  }

  async stop(channel: number, layer: number): Promise<void> {
    this.logger.info(`⏹️ Deteniendo clip en canal ${channel}, capa ${layer}`);
    
    if (!this.isConnected()) {
      throw new Error('Server not connected');
    }

    try {
      await this.sendCommand(`STOP ${channel}-${layer}`);
      this.logger.info('✅ Clip detenido exitosamente');
    } catch (error) {
      this.logger.error('❌ Error al detener clip:', error);
      throw error;
    }
  }

  private setConnected(value: boolean) {
    if (this.connected !== value) {
      this.connected = value;
      this.emit('connectionChange', { id: this.id, connected: value });
    }
  }
}
