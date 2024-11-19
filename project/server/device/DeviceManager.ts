import { DeviceConfig } from '@/lib/types/device';

export abstract class DeviceManager {
  protected id: number;
  protected name: string;
  protected host: string;
  protected port: number;
  protected enabled: boolean;
  protected connected: boolean = false;
  protected config: DeviceConfig;

  constructor(config: DeviceConfig) {
    this.id = config.id;
    this.name = config.name;
    this.host = config.host;
    this.port = config.port;
    this.enabled = config.enabled;
    this.config = config;
  }

  abstract connect(): Promise<boolean>;
  abstract disconnect(): Promise<void>;
  abstract initialize(): Promise<void>;
  
  isConnected(): boolean {
    return this.connected;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getConfig(): DeviceConfig {
    return {
      ...this.config,
      connected: this.connected
    };
  }
}