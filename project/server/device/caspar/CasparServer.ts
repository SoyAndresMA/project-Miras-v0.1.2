import { EventEmitter } from 'events';
import { StateManager } from './state/StateManager';
import { ConnectionManager } from './connection/ConnectionManager';
import { ConnectionConfig } from './types';
import { CommandManager } from './connection/CommandManager';
import { Logger } from './utils/Logger';
import { Channel } from './Channel';
import { CasparServerRepository } from '@/app/api/repositories/caspar-server.repository';

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

interface ServerState {
  version?: string;
  connected: boolean;
  media_files?: string;
  lastActivity?: any;
  lastError?: string | null;
  lastConnectionAttempt?: Date;
  lastSuccessfulConnection?: Date;
  lastErrorTime?: Date;
}

export class CasparServer extends EventEmitter {
  private static instances: Map<string, CasparServer> = new Map();
  private static repository: CasparServerRepository;
  private stateManager: StateManager;
  private connectionManager: ConnectionManager;
  private commandManager: CommandManager;
  private logger: Logger;
  private channels: Map<number, Channel>;
  private config: ConnectionConfig;
  private state: ServerState = {
    connected: false,
    version: undefined,
    media_files: '',
    lastActivity: null,
    lastError: null,
    lastConnectionAttempt: undefined,
    lastSuccessfulConnection: undefined,
    lastErrorTime: undefined
  };
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  private readonly CONNECTION_CHECK_INTERVAL = 30000; // 30 segundos

  private constructor(config: ConnectionConfig) {
    super();
    
    this.config = config;
    this.stateManager = new StateManager();
    this.connectionManager = new ConnectionManager(config);
    this.commandManager = new CommandManager(this.connectionManager);
    this.logger = new Logger(`CasparServer:${config.id}`);
    this.channels = new Map();
    
    if (!CasparServer.repository) {
      CasparServer.repository = CasparServerRepository.getInstance();
    }
    
    this.setupEventHandlers();
  }

  static getInstance(config: ConnectionConfig): CasparServer {
    const key = `${config.host}:${config.port}`;
    
    if (!this.instances.has(key)) {
      this.instances.set(key, new CasparServer(config));
    }
    
    return this.instances.get(key)!;
  }

  static getExistingInstance(id: number): CasparServer | undefined {
    return Array.from(this.instances.values()).find(server => server.config.id === id);
  }

  private async updateState(newState: Partial<ServerState>): Promise<void> {
    this.state = { ...this.state, ...newState };
    this.emit('stateChanged', this.state);
    
    try {
      await CasparServer.repository.updateServerState(this.config.id.toString(), newState);
    } catch (error) {
      this.logger.error('Failed to update server state in database', error);
    }
  }

  private startConnectionCheck(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }

    this.connectionCheckInterval = setInterval(async () => {
      try {
        const isConnected = await this.checkConnection();
        if (isConnected !== this.state.connected) {
          await this.updateState({ 
            connected: isConnected,
            lastConnectionAttempt: new Date(),
            ...(isConnected ? { lastSuccessfulConnection: new Date() } : {})
          });
        }
      } catch (error) {
        await this.updateState({
          connected: false,
          lastError: error.message,
          lastErrorTime: new Date()
        });
      }
    }, this.CONNECTION_CHECK_INTERVAL);
  }

  private stopConnectionCheck(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
  }

  async initialize(): Promise<void> {
    try {
      await this.updateState({
        connected: false,
        lastError: null,
        lastConnectionAttempt: new Date()
      });

      await this.connect();
      
      await this.updateState({
        connected: true,
        lastError: null,
        lastSuccessfulConnection: new Date()
      });
      
      await this.initializeResources();
      this.startConnectionCheck();
      
    } catch (error) {
      await this.updateState({
        connected: false,
        lastError: error.message,
        lastErrorTime: new Date()
      });
      
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.stopConnectionCheck();
    await this.connectionManager.disconnect();
    await this.updateState({ connected: false });
  }

  private async checkConnection(): Promise<boolean> {
    try {
      // Intenta ejecutar un comando simple para verificar la conexión
      await this.commandManager.sendCommand('VERSION');
      return true;
    } catch (error) {
      return false;
    }
  }

  getState(): ServerState {
    return { ...this.state };
  }

  async updateConfig(config: ConnectionConfig): Promise<void> {
    this.config = config;
    // Actualizar las opciones de conexión
    const connectionOptions: ConnectionConfig = {
      host: this.config.host,
      port: this.config.port,
      timeout: this.config.timeout || 10000
    };
    
    await this.connectionManager.updateOptions(connectionOptions);
  }

  static async getState(serverId: number): Promise<ServerState> {
    const repository = new CasparServerRepository();
    const server = await repository.findById(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }
    return {
      version: server.version,
      connected: server.enabled === true,
      media_files: server.media_files,
      lastActivity: server.last_connection
    };
  }

  async connect(): Promise<boolean> {
    this.logger.info(` Iniciando conexión al servidor ${this.config.name}...`);
    
    if (this.state.connected) {
      this.logger.info(' Ya conectado al servidor');
      return true;
    }

    try {
      this.logger.info(` Intentando conectar a ${this.config.host}:${this.config.port}...`);
      const connected = await this.connectionManager.connect();
      
      if (connected) {
        this.logger.info(' Conexión establecida exitosamente');
        await this.updateState({ connected: true });
        // Enviar VERSION sin esperar respuesta
        this.logger.info(' Enviando comando VERSION (sin esperar respuesta)...');
        this.sendCommand('VERSION').catch(error => {
          this.logger.warn(' No se pudo obtener VERSION, pero continuamos:', error);
        });

        return true;
      } else {
        this.logger.error(' No se pudo establecer la conexión');
        await this.updateState({ connected: false });
        return false;
      }
    } catch (error) {
      this.logger.error(' Error durante la conexión:', error);
      await this.updateState({ connected: false });
      return false;
    }
  }

  async sendCommand(command: string): Promise<any> {
    this.logger.info(` Enviando comando: ${command}`);
    
    if (!this.state.connected) {
      this.logger.error(' No se puede enviar el comando: servidor no conectado');
      throw new Error('Server not connected');
    }

    try {
      const response = await this.commandManager.sendCommand(command);
      this.logger.info(` Respuesta recibida:`, response);
      return response;
    } catch (error) {
      this.logger.error(' Error al enviar comando:', error);
      throw error;
    }
  }

  private async initializeResources(): Promise<void> {
    try {
      await this.updateMediaFiles();
      await this.parseInfoResponse(await this.sendCommand('INFO'));
    } catch (error) {
      this.logger.error('Error initializing resources:', error);
      throw error;
    }
  }

  private async updateMediaFiles(): Promise<void> {
    try {
      const response = await this.sendCommand('DATA LIST');
      await this.updateState({ media_files: response });
      this.logger.info(' Lista de archivos multimedia actualizada');
    } catch (error) {
      this.logger.error(' Error al obtener lista de archivos:', error);
      await this.updateState({ media_files: '' });
    }
  }

  getMediaFiles(): string {
    return this.state.media_files;
  }

  private setupEventHandlers(): void {
    // Eventos del ConnectionManager
    this.connectionManager.on('activity', (state) => {
      this.logger.debug('Actividad detectada:', state);
      this.emit('stateChanged', this.getState());
    });

    this.connectionManager.on('connect', () => {
      this.updateState({ connected: true });
      CasparServer.repository.updateState(this.config.id, { 
        connected: true,
        version: this.stateManager.getVersion()
      });
      this.emit('stateChanged', this.getState());
    });

    this.connectionManager.on('disconnect', () => {
      this.updateState({ connected: false });
      CasparServer.repository.updateState(this.config.id, { connected: false });
      this.emit('stateChanged', this.getState());
    });

    this.connectionManager.on('error', (error) => {
      this.logger.error('Error de conexión:', error);
      this.updateState({ connected: false });
      CasparServer.repository.updateState(this.config.id, { connected: false });
      this.emit('stateChanged', this.getState());
    });

    // Eventos del CommandManager
    this.commandManager.on('response', (response) => {
      this.logger.debug('Respuesta recibida:', response);
      this.emit('stateChanged', this.getState());
    });
  }

  async play(options: PlayOptions): Promise<void> {
    this.logger.info(' Iniciando reproducción de clip', options);
    
    if (!this.state.connected) {
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
      this.logger.info(' Clip iniciado exitosamente');
    } catch (error) {
      this.logger.error(' Error al reproducir clip:', error);
      throw error;
    }
  }

  async stop(channel: number, layer: number): Promise<void> {
    this.logger.info(` Deteniendo clip en canal ${channel}, capa ${layer}`);
    
    if (!this.state.connected) {
      throw new Error('Server not connected');
    }

    try {
      await this.sendCommand(`STOP ${channel}-${layer}`);
      this.logger.info(' Clip detenido exitosamente');
    } catch (error) {
      this.logger.error(' Error al detener clip:', error);
      throw error;
    }
  }

  private async parseVersionResponse(response: string): Promise<string> {
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
        this.logger.info(` Canal ${channelInfo.number}: ${channelInfo.format} (${channelInfo.status})`);
      }
    }

    this.stateManager.updateChannels(channels);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
