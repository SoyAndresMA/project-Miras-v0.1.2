import { EventEmitter } from 'events';
import Logger from '../utils/logger';
import { SpecificItemType, PlaybackState } from '../types/item';

// Tipos de eventos base
export type BaseEventType = 
  | 'PLAY'           // Solicitud de reproducción
  | 'STOP'           // Solicitud de detención
  | 'STATE_CHANGE'   // Cambio de estado
  | 'ERROR'          // Error en alguna operación
  | 'SERVER_STATUS'; // Estado del servidor

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

// Interfaz para eventos del servidor
export interface ServerStatusEvent {
  type: 'SERVER_STATUS';
  serverId: number;
  status: {
    connected: boolean;
    version?: string;
    name?: string;
  };
}

// Tipo unión para todos los eventos posibles
export type EventType = CasparClipEvent | CasparCameraEvent | ServerStatusEvent;

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

  public emit(event: EventType) {
    this.logger.debug('EventBus', 'Emit', `Emitting event type ${event.type}`, event);
    this.emitter.emit(event.type, event);
    this.emitter.emit('all', event);
  }

  public subscribe(eventType: string, callback: (event: EventType) => void): () => void {
    this.logger.debug('EventBus', 'Subscribe', `Adding subscriber for ${eventType}`);
    this.emitter.on(eventType, callback);
    return () => {
      this.logger.debug('EventBus', 'Unsubscribe', `Removing subscriber for ${eventType}`);
      this.emitter.off(eventType, callback);
    };
  }

  public unsubscribe(eventType: string, callback: (event: EventType) => void): void {
    this.logger.debug('EventBus', 'Unsubscribe', `Removing subscriber for ${eventType}`);
    this.emitter.off(eventType, callback);
  }
}

export default EventBus;