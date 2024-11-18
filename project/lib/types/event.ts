export interface MItem {
  id: number;
  type: string;
  position_row: number;
  position_column: number;
}

export interface MEvent {
  id: number;
  project_id: number;
  title: string;
  event_order: number;
  event_union_id: number;
  items: MItem[];
  munion?: MEventUnion;
}

export interface MEventUnion {
  id: number;
  name: string;
  icon: string;
  description: string | null;
  position?: number;
  delay?: number;
}

export interface CreateMEventInput {
  project_id: number;
  title: string;
  event_union_id: number;
}

// Type guards
export function isMClip(item: MItem): boolean {
  return item.type === 'clip';
}

export function isMCam(item: MItem): boolean {
  return item.type === 'cam';
}

export function isMPrompt(item: MItem): boolean {
  return item.type === 'prompt';
}

export function isMGraphics(item: MItem): boolean {
  return item.type === 'graphics';
}

export function isMSound(item: MItem): boolean {
  return item.type === 'sound';
}

export function isMMic(item: MItem): boolean {
  return item.type === 'mic';
}