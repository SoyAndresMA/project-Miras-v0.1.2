import { DeviceManager } from './DeviceManager';
import { DeviceConfig, PlaybackStatus, ServerStatus, ChannelConfig, LayerStatus } from '@/lib/types/device';
import { EventEmitter } from 'events';
import * as net from 'net';

export class Channel {
  private layers: Map<number, LayerStatus> = new Map();

  constructor(
    public readonly id: number,
    public readonly number: number,
    public readonly resolution: string,
    public readonly frameRate: number
  ) {}

  addLayer(layer: LayerStatus) {
    this.layers.set(layer.number, layer);
  }

  getLayer(layerNumber: number): LayerStatus | undefined {
    const layer = this.layers.get(layerNumber);
    return layer ? { ...layer } : null;
  }

  updateLayerStatus(layerNumber: number, status: Partial<LayerStatus>) {
    const layer = this.layers.get(layerNumber);
    if (layer) {
      Object.assign(layer, status);
    }
    return layer;
  }

  getLayers(): LayerStatus[] {
    return Array.from(this.layers.values());
  }
}

export class CasparServer extends DeviceManager {
  private static instances: Map<number, CasparServer> = new Map();
  private channels: Map<number, Channel> = new Map();
  private events: EventEmitter = new EventEmitter();
  private socket: net.Socket | null = null;
  private isConnected: boolean = false;
  private config: DeviceConfig;
  private connectPromise: Promise<void> | null = null;
  private statusInterval: NodeJS.Timeout | null = null;
  private responseBuffer: string = '';
  private pendingCommands: Map<string, { 
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    command: string;
  }> = new Map();

  private constructor(config: DeviceConfig) {
    super(config);
    this.config = config;
  }

  static getInstance(config: DeviceConfig): CasparServer {
    let instance = CasparServer.instances.get(config.id);
    if (!instance) {
      instance = new CasparServer(config);
      CasparServer.instances.set(config.id, instance);
    }
    return instance;
  }

  isServerConnected(): boolean {
    return this.isConnected && this.socket !== null;
  }

  async connect(): Promise<boolean> {
    console.log(`Attempting to connect to CasparCG Server at ${this.config.host}:${this.config.port}`);
    
    // Si ya está conectado, retornar true
    if (this.isConnected && this.socket) {
      console.log('Already connected to server');
      return true;
    }

    // Si hay una conexión en progreso, esperar a que termine
    if (this.connectPromise) {
      console.log('Connection already in progress, waiting...');
      await this.connectPromise;
      return this.isConnected;
    }

    this.connectPromise = new Promise((resolve, reject) => {
      try {
        console.log('Creating new socket connection...');
        this.socket = new net.Socket();

        // Timeout de 5 segundos
        this.socket.setTimeout(5000);

        this.socket.on('connect', () => {
          console.log(`Connected successfully to ${this.config.host}:${this.config.port}`);
          this.isConnected = true;
          this.startStatusPolling();
          resolve();
        });

        this.socket.on('error', (err) => {
          console.error('Socket error:', err);
          this.isConnected = false;
          reject(err);
        });

        this.socket.on('close', () => {
          console.log('Socket closed');
          this.isConnected = false;
          this.cleanup();
        });

        this.socket.on('timeout', () => {
          console.log('Socket timeout');
          this.socket?.destroy();
          reject(new Error('Connection timeout'));
        });

        console.log(`Connecting to ${this.config.host}:${this.config.port}...`);
        this.socket.connect(this.config.port, this.config.host);
      } catch (error) {
        console.error('Error during connection setup:', error);
        this.isConnected = false;
        reject(error);
      }
    });

    try {
      await this.connectPromise;
      return true;
    } catch (error) {
      console.error('Connection failed:', error);
      return false;
    } finally {
      this.connectPromise = null;
    }
  }

  async disconnect(): Promise<void> {
    console.log('Disconnecting from server...');
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.isConnected = false;
    this.connectPromise = null;
    this.cleanup();
    console.log('Disconnected from server');
  }

  private cleanup() {
    console.log('Cleaning up server resources...');
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
    this.responseBuffer = '';
    this.pendingCommands.clear();
  }

  // Método para reconectar si es necesario
  private async ensureConnection(): Promise<void> {
    if (!this.isConnected || !this.socket) {
      await this.connect();
    }
  }

  async getVersion(): Promise<string> {
    await this.ensureConnection();
    return this.sendCommand('VERSION');
  }

  async getSystemInfo(): Promise<string> {
    await this.ensureConnection();
    return this.sendCommand('INFO SYSTEM');
  }

  private async sendCommand(command: string): Promise<string> {
    if (!this.socket) {
      throw new Error('Not connected to server');
    }

    return new Promise((resolve, reject) => {
      let response = '';
      
      const dataHandler = (data: Buffer) => {
        const chunk = data.toString();
        console.log('Raw CasparCG data received:', chunk);
        response += chunk;

        // Si la respuesta termina con un salto de línea, consideramos que está completa
        if (response.endsWith('\r\n')) {
          cleanup();
          resolve(response.trim());
        }
      };

      const errorHandler = (error: Error) => {
        cleanup();
        reject(error);
      };

      const cleanup = () => {
        this.socket?.removeListener('data', dataHandler);
        this.socket?.removeListener('error', errorHandler);
      };

      this.socket.on('data', dataHandler);
      this.socket.on('error', errorHandler);

      console.log('Sending command:', command);
      this.socket.write(command + '\r\n');
    });
  }

  private startStatusPolling() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
    }

    this.statusInterval = setInterval(() => {
      if (this.isConnected) {
        const status = this.getStatus();
        this.events.emit('statusChange', status);
      }
    }, 1000);
  }

  private parseResponse(data: string): { code: number; data: string } {
    // Trim whitespace and handle empty responses
    const trimmedData = data.trim();
    if (!trimmedData) {
      // Instead of throwing error, return a neutral response
      return {
        code: 200,
        data: ''
      };
    }

    // Try to match standard CasparCG response format: XXX [data]
    const standardMatch = trimmedData.match(/^(\d{3})(?: (.+))?$/);
    if (standardMatch) {
      return {
        code: parseInt(standardMatch[1], 10),
        data: standardMatch[2] || ''
      };
    }

    // If it's not a standard response, try to extract any numeric code
    const numberMatch = trimmedData.match(/(\d{3})/);
    if (numberMatch) {
      return {
        code: parseInt(numberMatch[1], 10),
        data: trimmedData
      };
    }

    // If no numeric code found, treat as data with default success code
    return {
      code: 200,
      data: trimmedData
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.socket || !this.isConnected) {
        await this.connect();
      }

      // Try to get version as a simple test
      const version = await this.getVersion();
      console.log('CasparCG Version:', version);
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  private handleData(data: string) {
    try {
      // Log raw data for debugging
      console.debug('Raw CasparCG data received:', data);
      
      this.responseBuffer += data;

      while (this.responseBuffer.includes('\r\n')) {
        const lines = this.responseBuffer.split('\r\n');
        this.responseBuffer = lines.pop() || '';

        for (const line of lines) {
          try {
            // Skip empty lines
            if (!line.trim()) continue;

            const response = this.parseResponse(line);
            console.debug('Parsed response:', response);
            
            // Find the pending command that matches this response
            for (const [id, { resolve, reject, command }] of this.pendingCommands) {
              // More flexible matching - check if response contains any part of the command
              const commandParts = command.split(' ');
              const matchesCommand = commandParts.some(part => 
                line.toLowerCase().includes(part.toLowerCase())
              );

              if (matchesCommand) {
                if (response.code >= 400) {
                  reject(new Error(response.data));
                } else {
                  resolve(response.data);
                }
                this.pendingCommands.delete(id);
                break;
              }
            }
          } catch (error) {
            console.error('Error parsing line:', line, error);
          }
        }
      }
    } catch (error) {
      console.error('Error handling data:', error);
    }
  }

  async play(channel: number, layer: number, file: string): Promise<void> {
    const ch = this.channels.get(channel);
    if (!ch) throw new Error(`Channel ${channel} not found`);

    try {
      await this.sendCommand(`PLAY ${channel}-${layer} "${file}"`);

      const status = ch.updateLayerStatus(layer, {
        status: 'playing',
        currentMedia: file
      });

      if (status) {
        this.events.emit('statusChange', this.getStatus());
      }
    } catch (error) {
      console.error('Failed to send PLAY command:', error);
      throw error;
    }
  }

  async stop(channel: number, layer: number): Promise<void> {
    const ch = this.channels.get(channel);
    if (!ch) throw new Error(`Channel ${channel} not found`);

    try {
      await this.sendCommand(`STOP ${channel}-${layer}`);

      const status = ch.updateLayerStatus(layer, {
        status: 'stopped',
        currentMedia: null
      });

      if (status) {
        this.events.emit('statusChange', this.getStatus());
      }
    } catch (error) {
      console.error('Failed to send STOP command:', error);
      throw error;
    }
  }

  getStatus(): ServerStatus {
    const status: ServerStatus = {
      connected: this.isConnected,
      channels: {}
    };

    this.channels.forEach((channel, channelNumber) => {
      status.channels[channelNumber] = {
        layers: {}
      };
      
      channel.getLayers().forEach(layer => {
        status.channels[channelNumber].layers[layer.number] = layer;
      });
    });

    return status;
  }

  onStatusChange(callback: (status: ServerStatus) => void): () => void {
    this.events.on('statusChange', callback);
    return () => this.events.off('statusChange', callback);
  }
}