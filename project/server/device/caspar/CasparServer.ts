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
  private connected: boolean = false;
  private mediaFiles: string = '';

  private constructor(config: ConnectionConfig) {
    super();
    
    this.config = config;
    this.stateManager = new StateManager();
    this.connectionManager = new ConnectionManager(config);
    this.commandManager = new CommandManager(this.connectionManager);
    this.logger = new Logger(`CasparServer:${config.id}`);
    this.channels = new Map();
    
    if (!CasparServer.repository) {
      CasparServer.repository = new CasparServerRepository();
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

  async initialize(): Promise<void> {
    try {
      // Actualizar el estado en la base de datos
      await CasparServer.repository.updateServerState(this.config.id.toString(), {
        connected: false,
        lastError: null,
        lastConnectionAttempt: new Date()
      });

      // Intentar conexión
      await this.connect();
      
      // Si llegamos aquí, la conexión fue exitosa
      this.connected = true;
      
      await CasparServer.repository.updateServerState(this.config.id.toString(), {
        connected: true,
        lastError: null,
        lastSuccessfulConnection: new Date()
      });
      
      // Inicializar canales y otros recursos
      await this.initializeResources();
      
    } catch (error) {
      this.connected = false;
      
      await CasparServer.repository.updateServerState(this.config.id.toString(), {
        connected: false,
        lastError: error.message,
        lastErrorTime: new Date()
      });
      
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
    
    if (this.connected) {
      this.logger.info(' Ya conectado al servidor');
      return true;
    }

    try {
      this.logger.info(` Intentando conectar a ${this.config.host}:${this.config.port}...`);
      const connected = await this.connectionManager.connect();
      
      if (connected) {
        this.logger.info(' Conexión establecida exitosamente');
        this.setConnected(true);

        // Enviar VERSION sin esperar respuesta
        this.logger.info(' Enviando comando VERSION (sin esperar respuesta)...');
        this.sendCommand('VERSION').catch(error => {
          this.logger.warn(' No se pudo obtener VERSION, pero continuamos:', error);
        });

        return true;
      } else {
        this.logger.error(' No se pudo establecer la conexión');
        this.setConnected(false);
        return false;
      }
    } catch (error) {
      this.logger.error(' Error durante la conexión:', error);
      this.setConnected(false);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.logger.info(' Desconectando servidor...');
    
    if (!this.connected) {
      this.logger.info(' El servidor ya está desconectado');
      return;
    }

    try {
      await this.connectionManager.disconnect();
      this.setConnected(false);
      this.logger.info(' Servidor desconectado exitosamente');
    } catch (error) {
      this.logger.error(' Error al desconectar:', error);
      throw error;
    }
  }

  async sendCommand(command: string): Promise<any> {
    this.logger.info(` Enviando comando: ${command}`);
    
    if (!this.connected) {
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

  getServerState(): ServerState {
    return {
      version: this.stateManager.getState().version,
      connected: this.connected,
      media_files: this.mediaFiles,
      lastActivity: this.connectionManager.getLastActivity()
    };
  }

  private async updateMediaFiles(): Promise<void> {
    try {
      const response = await this.sendCommand('DATA LIST');
      this.mediaFiles = response;
      this.logger.info(' Lista de archivos multimedia actualizada');
    } catch (error) {
      this.logger.error(' Error al obtener lista de archivos:', error);
      this.mediaFiles = '';
    }
  }

  getMediaFiles(): string {
    return this.mediaFiles;
  }

  private setupEventHandlers(): void {
    // Eventos del ConnectionManager
    this.connectionManager.on('activity', (state) => {
      this.logger.debug('Actividad detectada:', state);
      this.emit('stateChange', this.getServerState());
    });

    this.connectionManager.on('connect', () => {
      this.setConnected(true);
      CasparServer.repository.updateState(this.config.id, { 
        connected: true,
        version: this.stateManager.getVersion()
      });
      this.emit('stateChange', this.getServerState());
    });

    this.connectionManager.on('disconnect', () => {
      this.setConnected(false);
      CasparServer.repository.updateState(this.config.id, { connected: false });
      this.emit('stateChange', this.getServerState());
    });

    this.connectionManager.on('error', (error) => {
      this.logger.error('Error de conexión:', error);
      this.setConnected(false);
      CasparServer.repository.updateState(this.config.id, { connected: false });
      this.emit('stateChange', this.getServerState());
    });

    // Eventos del CommandManager
    this.commandManager.on('response', (response) => {
      this.logger.debug('Respuesta recibida:', response);
      this.emit('stateChange', this.getServerState());
    });
  }

  setConnected(value: boolean) {
    if (this.connected !== value) {
      this.connected = value;
      this.emit('stateChange', this.getServerState());
    }
  }

  private async updateServerStatus(): Promise<void> {
    try {
      if (!this.connected) return;

      // No necesitamos enviar VERSION aquí ya que se hace en initialize()
      await this.updateMediaFiles();
    } catch (error) {
      this.logger.error('Error al actualizar estado del servidor:', error);
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
        this.logger.info(` Canal ${channelInfo.number}: ${channelInfo.format} (${channelInfo.status})`);
      }
    }

    this.stateManager.updateChannels(channels);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async play(options: PlayOptions): Promise<void> {
    this.logger.info(' Iniciando reproducción de clip', options);
    
    if (!this.connected) {
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
    
    if (!this.connected) {
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
}
