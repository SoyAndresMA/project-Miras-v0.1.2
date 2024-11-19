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
  'casparClip': CasparClipEventType;
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
export interface CasparClipEvent extends BaseItemEvent<'casparClip'> {
  metadata?: {
    currentTime?: number;
    duration?: number;
    volume?: number;
  };
}

export interface CasparCameraEvent extends BaseItemEvent<'casparCamera'> {
  metadata?: {
    previewEnabled?: boolean;
    settings?: Record<string, unknown>;
  };
}

export type MItemEvent = BaseItemEvent<SpecificItemType>;

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

  public emit<T extends SpecificItemType>(event: BaseItemEvent<T>) {
    this.logger.debug('Emitting event', {
      itemId: event.itemId,
      type: event.type,
      action: event.action,
      metadata: event.metadata
    });

    // Emitir evento específico del tipo
    this.emitter.emit(`${event.type}:${event.itemId}`, event);
    
    // Emitir evento general para compatibilidad
    this.emitter.emit('item:event', event);
  }

  public subscribe<T extends SpecificItemType>(
    itemId: number,
    type: T,
    callback: (event: BaseItemEvent<T>) => void
  ): () => void {
    const eventName = `${type}:${itemId}`;
    this.emitter.on(eventName, callback);
    
    return () => {
      this.emitter.off(eventName, callback);
    };
  }

  public subscribeToAll(
    callback: (event: MItemEvent) => void
  ): () => void {
    this.emitter.on('item:event', callback);
    
    return () => {
      this.emitter.off('item:event', callback);
    };
  }
}

export default EventBus.getInstance();