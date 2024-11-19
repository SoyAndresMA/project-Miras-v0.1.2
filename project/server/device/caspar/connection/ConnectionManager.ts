import { EventEmitter } from 'events';
import * as net from 'net';
import { ConnectionConfig, ConnectionState } from '../types';
import { Logger } from '../utils/Logger';
import { CommandManager } from '../command/CommandManager';

export class ConnectionManager extends EventEmitter {
  private socket: net.Socket | null = null;
  private connectPromise: Promise<boolean> | null = null;
  private state: ConnectionState = {
    isConnected: false,
    reconnectAttempts: 0,
    lastActivity: 0
  };
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private activityCheckInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private intentionalDisconnect: boolean = false;
  private connecting: boolean = false;
  private readonly KEEP_ALIVE_INTERVAL = 30000; // 30 segundos
  private readonly ACTIVITY_CHECK_INTERVAL = 5000; // 5 segundos
  private readonly ACTIVITY_TIMEOUT = 60000; // 1 minuto sin actividad para considerar timeout
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 5000; // 5 segundos

  constructor(
    private logger: Logger,
    private config: ConnectionConfig,
    private commandManager: CommandManager
  ) {
    super();
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.on('sendCommand', (command: string) => {
      if (this.socket && this.state.isConnected) {
        this.socket.write(command + '\r\n');
      }
    });
  }

  async connect(): Promise<boolean> {
    if (this.state.isConnected) {
      this.logger.info('Ya conectado');
      return true;
    }

    if (this.connecting) {
      this.logger.info('Conexión en progreso, esperando...');
      return false;
    }

    this.connecting = true;

    return new Promise((resolve) => {
      try {
        this.logger.info(' Creando nueva conexión de socket...');
        
        // Crear el socket
        this.socket = new net.Socket();
        
        // Configurar el encoding
        this.socket.setEncoding('utf8');

        // Pasar el socket al CommandManager inmediatamente
        this.commandManager.setSocket(this.socket);

        // Manejar eventos del socket
        this.socket.on('connect', () => {
          this.logger.info(` Conectado a ${this.config.host}:${this.config.port}`);
          this.state.isConnected = true;
          this.state.reconnectAttempts = 0;
          this.state.lastActivity = Date.now();
          this.connecting = false;
          this.startKeepAlive();
          resolve(true);
        });

        this.socket.on('data', (data: string) => {
          this.state.lastActivity = Date.now();
          this.commandManager.handleResponse(data);
        });

        this.socket.on('error', (error: Error) => {
          this.logger.error(' Error en el socket:', error);
          this.state.isConnected = false;
          this.stopKeepAlive();
          this.connecting = false;
          resolve(false);
        });

        this.socket.on('close', () => {
          if (this.state.isConnected) {
            this.logger.info('Conexión cerrada');
            this.state.isConnected = false;
          }
          this.connecting = false;
          this.socket = null;
          this.commandManager.setSocket(null);
        });

        // Intentar conectar
        this.logger.info(` Conectando a ${this.config.host}:${this.config.port}...`);
        this.socket.connect({
          host: this.config.host,
          port: this.config.port
        });

      } catch (error) {
        this.logger.error(' Error al crear la conexión:', error);
        this.connecting = false;
        resolve(false);
      }
    });
  }

  private startKeepAlive() {
    this.keepAliveInterval = setInterval(() => {
      if (this.state.isConnected && this.socket) {
        // Enviamos un comando INFO en lugar de VERSION para mantener viva la conexión
        this.socket.write('INFO\r\n');
      }
    }, this.KEEP_ALIVE_INTERVAL);

    this.activityCheckInterval = setInterval(() => {
      const inactiveTime = Date.now() - this.state.lastActivity;
      if (inactiveTime > this.ACTIVITY_TIMEOUT) {
        this.logger.warn('Timeout de inactividad, reconectando...');
        this.reconnect();
      }
    }, this.ACTIVITY_CHECK_INTERVAL);
  }

  private stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }
  }

  private handleDisconnect() {
    if (this.state.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.state.reconnectAttempts++;
      this.reconnectTimeout = setTimeout(() => {
        this.reconnect();
      }, this.RECONNECT_DELAY);
    } else {
      this.emit('maxReconnectAttemptsReached');
    }
  }

  private async reconnect() {
    this.logger.info('Intentando reconectar...');
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.connectPromise = null;
    try {
      await this.connect();
    } catch (error) {
      this.logger.error('Error al reconectar:', error);
    }
  }

  async disconnect() {
    if (this.socket) {
      this.logger.info('Cerrando conexión...');
      try {
        await new Promise<void>((resolve) => {
          this.socket!.end(() => {
            this.socket!.destroy();
            resolve();
          });
        });
      } catch (error) {
        this.logger.error('Error al cerrar socket:', error);
      }
      this.socket = null;
    }
    this.state.isConnected = false;
    this.connecting = false;
  }

  isConnected(): boolean {
    return this.state.isConnected;
  }

  async updateOptions(newOptions: ConnectionConfig): Promise<void> {
    this.config = newOptions;
    
    // Si hay una conexión activa, reconectar con las nuevas opciones
    if (this.state.isConnected && this.socket) {
      await this.disconnect();
      await this.connect();
    }
  }
}
