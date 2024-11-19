import { EventEmitter } from 'events';
import Logger from '../utils/logger';
import { SpecificItemType, PlaybackState } from '../types/item';

// Tipos de eventos base
export type BaseEventType = 
  | 'PLAY'           // Solicitud de reproducción
  | 'STOP'           // Solicitud de detención
  | 'STATE_CHANGE'   // Cambio de estado
  | 'ERROR';         // Error en alguna operación

// Eventos específicos por tipo de item
export type CasparClipEventType = BaseEventType | 'SEEK' | 'VOLUME_CHANGE';
export type CasparCameraEventType = BaseEventType | 'PREVIEW' | 'SETTINGS';
export type ObsClipEventType = BaseEventType | 'VISIBILITY' | 'TRANSITION';

// Mapa de tipos de eventos específicos
export type ItemEventTypeMap = {
  'CasparClip': CasparClipEventType;
  'casparCamera': CasparCameraEventType;
  'casparMicrophone': BaseEventType;
  'casparGraphic': BaseEventType;
  'obsClip': ObsClipEventType;
  'obsCamera': BaseEventType;
  'obsGraphic': BaseEventType;
  'obsMicrophone': BaseEventType;
};

// Interfaz base para eventos
export interface BaseItemEvent<T extends SpecificItemType> {
  itemId: number;
  type: T;
  action: ItemEventTypeMap[T];
  state?: PlaybackState;
  error?: string;
  metadata?: Record<string, unknown>;
}

// Tipos específicos de eventos
export interface CasparClipEvent extends BaseItemEvent<'CasparClip'> {
  metadata?: {
    currentTime?: number;
    duration?: number;
    volume?: number;
  }
}

export interface CasparCameraEvent extends BaseItemEvent<'casparCamera'> {
  metadata?: {
    previewEnabled?: boolean;
    settings?: Record<string, unknown>;
  }
}

export type MItemEvent = CasparClipEvent | CasparCameraEvent;

class EventBus {
  private static instance: EventBus;
  private emitter: EventEmitter;
  private logger: Logger;

  private constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(50);
    this.logger = new Logger('EventBus');
    this.logger.info('EventBus initialized');
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public emit(event: MItemEvent) {
    this.logger.debug('EventBus', 'Emit', `Emitting event for item ${event.itemId}`, event);
    this.emitter.emit(`${event.type}:${event.itemId}`, event);
    this.emitter.emit('all', event);
  }

  public subscribe(callback: (event: MItemEvent) => void): () => void {
    this.logger.debug('EventBus', 'Subscribe', 'Adding new subscriber');
    this.emitter.on('all', callback);
    return () => {
      this.logger.debug('EventBus', 'Unsubscribe', 'Removing subscriber');
      this.emitter.off('all', callback);
    };
  }
}

export default EventBus;