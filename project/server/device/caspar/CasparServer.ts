import { EventEmitter } from 'events';
import { StateManager } from './state/StateManager';
import { ConnectionManager } from './connection/ConnectionManager';
import { ConnectionConfig } from './types';
import { CommandManager } from './connection/CommandManager';
import { Logger } from './utils/Logger';
import { Channel } from './Channel';
import getDb from '../../../db';

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
  private static instances: Map<number, CasparServer> = new Map();
  
  private logger: Logger;
  private connectionManager: ConnectionManager;
  private commandManager: CommandManager;
  private stateManager: StateManager;
  private connected = false;
  private mediaFiles: string = '';
  private id: number;
  private name: string;
  private host: string;
  private port: number;
  private enabled: boolean;

  constructor(config: ConnectionConfig) {
    super();
    
    this.id = config.id;
    this.name = config.name;
    this.host = config.host;
    this.port = config.port;
    
    this.logger = new Logger(`CasparServer:${this.id}`);
    
    const connectionOptions: ConnectionConfig = {
      id: this.id,
      name: this.name,
      host: this.host,
      port: this.port,
      timeout: config.timeout || 10000
    };

    // Primero crear el CommandManager
    this.commandManager = new CommandManager(this.logger, config.timeout || 10000);
    
    // Luego crear el ConnectionManager pasándole el CommandManager
    this.connectionManager = new ConnectionManager(
      this.logger,
      connectionOptions,
      this.commandManager
    );

    this.stateManager = new StateManager(this.logger);

    this.setupEventListeners();
  }

  static async getInstance(config: ConnectionConfig): Promise<CasparServer> {
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

  async updateConfig(config: ConnectionConfig): Promise<void> {
    this.id = config.id;
    this.name = config.name;
    this.host = config.host;
    this.port = config.port;
    this.enabled = config.enabled;
    
    // Actualizar las opciones de conexión
    const connectionOptions: ConnectionConfig = {
      host: this.host,
      port: this.port,
      timeout: config.timeout || 10000
    };
    
    await this.connectionManager.updateOptions(connectionOptions);
  }

  static getState(serverId: number): Promise<ServerState> {
    const server = CasparServer.instances.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }
    return Promise.resolve(server.getServerState());
  }

  async initialize(): Promise<void> {
    this.logger.info('🚀 Inicializando servidor CasparCG...');
    
    try {
      // Conectar al servidor
      const connected = await this.connect();
      if (!connected) {
        throw new Error('Failed to connect to server');
      }

      // Esperar un momento para asegurar que la conexión está estable
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Obtener lista de archivos multimedia
      await this.updateMediaFiles();

      try {
        // Actualizar estado en la base de datos
        const db = await getDb();
        await db.run(`
          UPDATE casparcg_servers 
          SET media_files = ?, last_connection = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [this.mediaFiles, this.id]);
      } catch (dbError) {
        this.logger.warn('⚠️ No se pudo actualizar la base de datos:', dbError);
        // Continuamos aunque falle la actualización de la BD
      }

      this.logger.info('✅ Servidor inicializado correctamente');
    } catch (error) {
      this.logger.error('❌ Error al inicializar servidor:', error);
      throw error;
    }
  }

  async connect(): Promise<boolean> {
    this.logger.info(`🔄 Iniciando conexión al servidor ${this.name}...`);
    
    if (this.connected) {
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
    
    if (!this.connected) {
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
    
    if (!this.connected) {
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
      this.logger.info('📁 Lista de archivos multimedia actualizada');
    } catch (error) {
      this.logger.error('❌ Error al obtener lista de archivos:', error);
      this.mediaFiles = '';
    }
  }

  getMediaFiles(): string {
    return this.mediaFiles;
  }

  private setupEventListeners(): void {
    // Eventos del ConnectionManager
    this.connectionManager.on('activity', (state) => {
      this.logger.debug('Actividad detectada:', state);
      this.emit('stateChange', this.getServerState());
    });

    this.connectionManager.on('connect', () => {
      this.setConnected(true);
      this.emit('stateChange', this.getServerState());
    });

    this.connectionManager.on('disconnect', () => {
      this.setConnected(false);
      this.emit('stateChange', this.getServerState());
    });

    this.connectionManager.on('error', (error) => {
      this.logger.error('Error de conexión:', error);
      this.setConnected(false);
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
      this.logger.info('✅ Clip iniciado exitosamente');
    } catch (error) {
      this.logger.error('❌ Error al reproducir clip:', error);
      throw error;
    }
  }

  async stop(channel: number, layer: number): Promise<void> {
    this.logger.info(`⏹️ Deteniendo clip en canal ${channel}, capa ${layer}`);
    
    if (!this.connected) {
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
}
