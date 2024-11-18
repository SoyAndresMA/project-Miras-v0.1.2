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
  version?: string;
  channel_formats?: string;
  last_connection?: string;
  connected: boolean;
  loading?: boolean;
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