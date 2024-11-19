import { MItem } from '../types/item';

export interface BaseRepository<T extends MItem> {
  findById(id: number): Promise<T | null>;
  findByEventId(eventId: number): Promise<T[]>;
  create(item: Omit<T, 'id'>): Promise<T>;
  update(id: number, item: Partial<T>): Promise<T>;
  delete(id: number): Promise<void>;
  
  // Métodos específicos para posicionamiento
  updatePosition(id: number, row: number, column: number): Promise<void>;
  getPosition(id: number): Promise<{ row: number; column: number } | null>;
}
