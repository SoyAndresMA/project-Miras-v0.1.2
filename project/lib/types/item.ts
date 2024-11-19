import { MEventUnion } from './event';

// Base Types
export type MediaItemType = 'caspar' | 'obs';
export type ItemCategory = 'clip' | 'camera' | 'microphone' | 'graphic';

// Union type for specific item types
export type SpecificItemType = 
  | 'casparClip'
  | 'casparCamera'
  | 'casparMicrophone'
  | 'casparGraphic'
  | 'obsClip'
  | 'obsCamera'
  | 'obsGraphic'
  | 'obsMicrophone';

// Base interface for all media items
export interface MItem {
  readonly id: number;
  readonly type: SpecificItemType;
  readonly position: GridPosition;
  readonly state: PlaybackState;
  
  execute(): Promise<void>;
  stop(): Promise<void>;
  getState(): PlaybackState;
}

// Common types
export interface GridPosition {
  row: number;
  column: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

// Caspar-specific implementations
export interface CasparClip extends MItem {
  readonly type: 'casparClip';
  readonly filePath: string;
  readonly channel: number;
  readonly layer: number;
  readonly loop: boolean;
  readonly autoStart: boolean;
  
  seek(position: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
}

export interface CasparCamera extends MItem {
  readonly type: 'casparCamera';
  readonly deviceId: string;
  readonly channel: number;
  readonly layer: number;
  
  setPreview(enabled: boolean): Promise<void>;
}

export interface CasparMicrophone extends MItem {
  readonly type: 'casparMicrophone';
  readonly deviceId: string;
  readonly channel: number;
  readonly layer: number;
}

export interface CasparGraphic extends MItem {
  readonly type: 'casparGraphic';
  readonly filePath: string;
  readonly channel: number;
  readonly layer: number;
}

// OBS-specific implementations
export interface ObsClip extends MItem {
  readonly type: 'obsClip';
  readonly sceneName: string;
  readonly sourceName: string;
  
  setVisibility(visible: boolean): Promise<void>;
}

export interface ObsCamera extends MItem {
  readonly type: 'obsCamera';
  readonly deviceId: string;
  readonly sceneName: string;
  
  setFilter(filterName: string, enabled: boolean): Promise<void>;
}

export interface ObsMicrophone extends MItem {
  readonly type: 'obsMicrophone';
  readonly deviceId: string;
  readonly sceneName: string;
}

export interface ObsGraphic extends MItem {
  readonly type: 'obsGraphic';
  readonly sceneName: string;
  readonly sourceName: string;
}

// Configuration interfaces
export interface CasparItemConfig {
  id: number;
  name: string;
  channel?: number;
  layer?: number;
  transition?: {
    type: string;
    duration: number;
  };
}

export interface ObsItemConfig {
  id: number;
  name: string;
  sceneName: string;
  sourceName: string;
  filters?: string[];
}