import { DeviceConfig } from '@/lib/types/device';

export interface AMCPResponse {
  code: number;
  data: string;
}

export interface CommandQueueItem {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  command: string;
  timeout?: NodeJS.Timeout;
}

export interface ConnectionOptions {
  host: string;
  port: number;
  timeout?: number;
}

export interface ServerStateData {
  connected: boolean;
  version: string | null;
  channels: ChannelInfo[];
}

export interface ConnectionState {
  isConnected: boolean;
  lastError?: Error;
  lastConnection?: Date;
  reconnectAttempts: number;
  lastActivity: number;
}

export interface CasparServerConfig extends DeviceConfig {
  reconnectDelay?: number;
  commandTimeout?: number;
  maxReconnectAttempts?: number;
}

export interface ChannelInfo {
  id: number;
  number: number;
  resolution?: string;
  frameRate?: number;
  layers: LayerInfo[];
}

export interface LayerInfo {
  number: number;
  status: 'playing' | 'stopped' | 'paused';
  media?: string;
  foreground?: {
    name: string;
    type: string;
    length: number;
  };
  background?: {
    name: string;
    type: string;
    length: number;
  };
}
