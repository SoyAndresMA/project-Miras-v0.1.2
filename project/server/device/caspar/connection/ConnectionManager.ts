import { EventEmitter } from 'events';
import * as net from 'net';
import { ConnectionOptions, ConnectionState } from '../types';
import { Logger } from '../utils/Logger';

export class ConnectionManager extends EventEmitter {
  private socket: net.Socket | null = null;
  private connectPromise: Promise<boolean> | null = null;
  private state: ConnectionState = {
    isConnected: false,
    reconnectAttempts: 0
  };

  constructor(
    private options: ConnectionOptions,
    private logger: Logger
  ) {
    super();
  }

  async connect(): Promise<boolean> {
    this.logger.info(`🔌 Intentando conectar a ${this.options.host}:${this.options.port}`);
    
    if (this.isConnected()) {
      this.logger.info('✅ Ya conectado al servidor');
      return true;
    }

    if (this.connectPromise) {
      this.logger.info('⏳ Conexión en progreso, esperando...');
      return this.connectPromise;
    }

    this.connectPromise = new Promise<boolean>((resolve, reject) => {
      try {
        this.logger.debug('🔄 Creando nueva conexión de socket...');
        this.socket = new net.Socket();
        this.socket.setTimeout(this.options.timeout || 5000);
        
        this.setupSocketListeners(resolve, reject);
        
        this.logger.debug(`🔄 Conectando a ${this.options.host}:${this.options.port}...`);
        this.socket.connect({
          host: this.options.host,
          port: this.options.port
        });

      } catch (error) {
        this.logger.error('❌ Error al crear socket:', error);
        this.cleanup();
        reject(error);
      }
    });

    try {
      const connected = await this.connectPromise;
      this.connectPromise = null;
      return connected;
    } catch (error) {
      this.logger.error('❌ Error en la conexión:', error);
      this.connectPromise = null;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.logger.info('🔌 Desconectando del servidor...');
    
    if (this.socket) {
      try {
        this.logger.debug('🔄 Cerrando conexión de socket...');
        this.socket.end();
        await new Promise<void>((resolve) => {
          if (this.socket) {
            this.socket.once('close', () => resolve());
            setTimeout(() => {
              if (this.socket) {
                this.socket.destroy();
              }
              resolve();
            }, 1000);
          } else {
            resolve();
          }
        });
      } catch (error) {
        this.logger.error('❌ Error al cerrar socket:', error);
      } finally {
        this.socket = null;
      }
    }

    this.state.isConnected = false;
    this.connectPromise = null;
    this.logger.info('✅ Desconexión completada');
  }

  isConnected(): boolean {
    return this.state.isConnected && this.socket !== null && !this.socket.destroyed;
  }

  getSocket(): net.Socket | null {
    return this.socket;
  }

  updateOptions(options: ConnectionOptions): void {
    this.options = options;
  }

  private setupSocketListeners(resolve: (value: boolean) => void, reject: (reason: any) => void): void {
    if (!this.socket) {
      reject(new Error('Socket no inicializado'));
      return;
    }

    this.socket.on('connect', () => {
      this.logger.info('✅ Conexión establecida');
      this.state.isConnected = true;
      this.state.reconnectAttempts = 0;
      this.emit('connect');
      resolve(true);
    });

    this.socket.on('error', (error: Error) => {
      const errorMessage = `Error de conexión a ${this.options.host}:${this.options.port} - ${error.message}`;
      this.logger.error('❌', errorMessage);
      this.state.isConnected = false;
      this.emit('error', error);
      
      if (error.message.includes('ECONNREFUSED')) {
        reject(new Error(`No se pudo conectar al servidor ${this.options.host}:${this.options.port} - Servidor no disponible`));
      } else if (error.message.includes('ETIMEDOUT')) {
        reject(new Error(`Timeout al conectar a ${this.options.host}:${this.options.port} - El servidor no responde`));
      } else {
        reject(error);
      }
    });

    this.socket.on('timeout', () => {
      const errorMessage = `Timeout al conectar a ${this.options.host}:${this.options.port}`;
      this.logger.error('⏰', errorMessage);
      this.socket?.destroy(new Error(errorMessage));
      this.state.isConnected = false;
      this.emit('timeout');
      reject(new Error(errorMessage));
    });

    this.socket.on('close', (hadError: boolean) => {
      this.logger.info(`🔌 Conexión cerrada${hadError ? ' por error' : ''}`);
      this.state.isConnected = false;
      this.emit('close', hadError);
      
      if (this.connectPromise) {
        reject(new Error(`Conexión cerrada${hadError ? ' por error' : ''}`));
      }
    });

    this.socket.on('end', () => {
      this.logger.info('🔌 Servidor cerró la conexión');
      this.state.isConnected = false;
      this.emit('end');
      
      if (this.connectPromise) {
        reject(new Error('El servidor cerró la conexión'));
      }
    });

    this.socket.on('data', (data: Buffer) => {
      this.emit('data', data);
    });
  }

  private cleanup(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = null;
    }
    this.state.isConnected = false;
    this.connectPromise = null;
  }
}
