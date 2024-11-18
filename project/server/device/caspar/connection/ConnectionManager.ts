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

  private setupSocketListeners(resolve: (value: boolean) => void, reject: (error: Error) => void): void {
    if (!this.socket) return;

    // Timeout handler
    this.socket.on('timeout', () => {
      this.logger.error('⏰ Timeout de conexión');
      this.cleanup();
      reject(new Error('Connection timeout'));
    });

    // Connection success handler
    this.socket.on('connect', () => {
      this.logger.info(`✅ Conectado exitosamente a ${this.options.host}:${this.options.port}`);
      this.state.isConnected = true;
      this.state.lastConnection = new Date();
      this.state.reconnectAttempts = 0;
      resolve(true);
    });

    // Error handler
    this.socket.on('error', (error) => {
      this.logger.error(`❌ Error de socket:`, error);
      this.cleanup();
      reject(error);
    });

    // Close handler
    this.socket.on('close', () => {
      this.logger.info('🔌 Conexión cerrada');
      this.cleanup();
    });

    // Data handler
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
  }
}
