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

export interface ConnectionConfig {
  id: number;
  name: string;
  host: string;
  port: number;
  timeout?: number;
  enabled?: boolean;
}

export interface ConnectionState {
  connected: boolean;
  lastError?: string;
}

export interface ServerState {
  version?: string;
  connected: boolean;
  media_files?: string;
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
