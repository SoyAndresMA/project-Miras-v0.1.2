import { MEventUnion } from './event';

export type MItemType = 
  | 'casparMClip'
  | 'casparMGraph'
  | 'casparMMic'
  | 'casparMCam'
  | 'obsMClip'
  | 'obsMCam'
  | 'obsMGraph'
  | 'obsMMic';

export interface MItemUnion {
  id: number;
  name: string;
  description: string;
  icon: string;
  compatible_items: MItemType[];
  position: number;
  delay: number;
}

export interface MItem {
  id: number;
  type: MItemType;
  position_row: number;
  position_column: number;
  munion?: MItemUnion;
  icon?: string;
  state?: MItemState;
  execute(): Promise<void>;
  stop(): Promise<void>;
}

export interface MItemState {
  isPlaying: boolean;
  error?: string;
}

export interface CasparMClipConfig {
  id: number;
  event_id: number;
  name: string;
  file_path: string;
  channel: number;
  layer: number;
  loop: boolean;
  transition_type?: string;
  transition_duration?: number;
  auto_start?: boolean;
}