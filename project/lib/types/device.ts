export interface DeviceConfig {
  id: number;
  name: string;
  host: string;
  port: number;
  description?: string;
  username?: string;
  password?: string;
  preview_channel?: number;
  locked_channel?: number;
  is_shadow: boolean;
  enabled: boolean;
  connected: boolean;
  version?: string;
  channel_formats?: string;
  last_connection?: string;
  loading?: boolean;
  // New connection settings
  auto_reconnect?: boolean;
  max_reconnect_attempts?: number;
  reconnect_interval?: number;
  connection_timeout?: number;
}

export interface PlaybackStatus {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  channel: number;
  layer: number;
}

export interface LayerStatus {
  id: number;
  number: number;
  currentMedia: string | null;
  status: 'playing' | 'stopped' | 'paused';
  volume: number;
  muted: boolean;
}

export interface ChannelConfig {
  id: number;
  number: number;
  resolution: string;
  frameRate: number;
  enabled: boolean;
}

export interface ServerStatus {
  connected: boolean;
  channels: {
    [key: number]: {
      layers: {
        [key: number]: LayerStatus;
      };
    };
  };
}