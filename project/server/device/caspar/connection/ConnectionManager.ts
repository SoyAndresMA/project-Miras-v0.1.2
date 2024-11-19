import { EventEmitter } from 'events';
import * as net from 'net';
import { ConnectionOptions, ConnectionState } from '../types';
import { Logger } from '../utils/Logger';

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
  private readonly KEEP_ALIVE_INTERVAL = 30000; // 30 segundos
  private readonly ACTIVITY_CHECK_INTERVAL = 5000; // 5 segundos
  private readonly ACTIVITY_TIMEOUT = 60000; // 1 minuto sin actividad para considerar timeout
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 5000; // 5 segundos

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
        
        // Configurar keep-alive a nivel de socket
        this.socket.setKeepAlive(true, this.KEEP_ALIVE_INTERVAL);
        
        // No establecemos timeout en el socket, lo manejamos nosotros
        this.socket.setTimeout(0);
        
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
      if (connected) {
        this.startKeepAlive();
        this.startActivityCheck();
        this.updateLastActivity();
      }
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
      this.updateLastActivity();
      this.emit('connect');
      resolve(true);
    });

    this.socket.on('error', (error: Error) => {
      const errorMessage = `Error de conexión a ${this.options.host}:${this.options.port} - ${error.message}`;
      this.logger.error('❌', errorMessage);
      this.updateLastActivity(); // Actualizar actividad incluso en error
      this.emit('error', error);
      
      // No rechazar inmediatamente, intentar reconectar
      if (!this.shouldAttemptReconnect()) {
        reject(new Error(`No se pudo conectar al servidor ${this.options.host}:${this.options.port} - Máximo de intentos alcanzado`));
      }
    });

    this.socket.on('timeout', () => {
      this.logger.warn('⏰ Timeout de conexión - Intentando mantener conexión...');
      // No destruir el socket, solo emitir el evento
      this.emit('timeout');
    });

    this.socket.on('close', (hadError: boolean) => {
      this.logger.info(`🔌 Conexión cerrada${hadError ? ' por error' : ''}`);
      this.state.isConnected = false;
      this.emit('close', hadError);
      
      if (this.shouldAttemptReconnect()) {
        this.attemptReconnect();
      } else if (this.connectPromise) {
        reject(new Error(`Conexión cerrada${hadError ? ' por error' : ''}`));
      }
    });

    this.socket.on('end', () => {
      this.logger.info('🔌 Servidor cerró la conexión');
      this.state.isConnected = false;
      this.emit('end');
      
      if (this.shouldAttemptReconnect()) {
        this.attemptReconnect();
      } else if (this.connectPromise) {
        reject(new Error('El servidor cerró la conexión'));
      }
    });

    this.socket.on('data', (data: Buffer) => {
      this.updateLastActivity();
      this.emit('data', data);
    });
  }

  private cleanup(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = null;
    }
    this.stopKeepAlive();
    this.stopActivityCheck();
    this.clearReconnectTimeout();
    this.state.isConnected = false;
    this.connectPromise = null;
  }

  private startKeepAlive(): void {
    this.stopKeepAlive();
    this.keepAliveInterval = setInterval(() => {
      if (this.socket && this.isConnected()) {
        // Enviar un pequeño paquete para mantener la conexión viva
        this.socket.write(Buffer.from([0]));
        this.updateLastActivity();
      }
    }, this.KEEP_ALIVE_INTERVAL);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  private startActivityCheck(): void {
    this.stopActivityCheck();
    this.activityCheckInterval = setInterval(() => {
      if (this.socket && this.isConnected()) {
        const timeSinceLastActivity = Date.now() - this.state.lastActivity;
        if (timeSinceLastActivity > this.ACTIVITY_TIMEOUT) {
          // Solo logueamos el warning, no desconectamos
          this.logger.warn(`⚠️ Sin actividad por ${Math.floor(timeSinceLastActivity / 1000)} segundos`);
          // Intentar un ping al servidor
          this.socket.write(Buffer.from([0]));
        }
      }
    }, this.ACTIVITY_CHECK_INTERVAL);
  }

  private stopActivityCheck(): void {
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }
  }

  private updateLastActivity(): void {
    this.state.lastActivity = Date.now();
  }

  private shouldAttemptReconnect(): boolean {
    return this.state.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS;
  }

  private attemptReconnect(): void {
    if (this.reconnectTimeout) {
      return; // Ya hay un intento de reconexión en progreso
    }

    this.state.reconnectAttempts++;
    this.logger.info(`🔄 Intento de reconexión ${this.state.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}`);

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      try {
        await this.connect();
      } catch (error) {
        this.logger.error('❌ Error en reconexión:', error);
      }
    }, this.RECONNECT_DELAY);
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
}
