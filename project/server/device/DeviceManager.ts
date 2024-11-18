import { DeviceConfig } from '@/lib/types/device';

export abstract class DeviceManager {
  protected id: number;
  protected name: string;
  protected host: string;
  protected port: number;
  protected active: boolean;
  protected connected: boolean = false;

  constructor(config: DeviceConfig) {
    this.id = config.id;
    this.name = config.name;
    this.host = config.host;
    this.port = config.port;
    this.active = config.active;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract initialize(): Promise<void>;
  
  isConnected(): boolean {
    return this.connected;
  }

  getConfig(): DeviceConfig {
    return {
      id: this.id,
      name: this.name,
      host: this.host,
      port: this.port,
      active: this.active
    };
  }
}