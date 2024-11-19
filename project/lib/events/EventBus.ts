import { EventEmitter } from 'events';
import Logger from '../utils/logger';

// Tipos de eventos posibles
export type MItemEventType = 
  | 'PLAY'           // Solicitud de reproducción
  | 'STOP'           // Solicitud de detención
  | 'STATE_CHANGE'   // Cambio de estado
  | 'ERROR';         // Error en alguna operación

// Tipos de items soportados
export type MItemType = 'casparMClip' | 'obsMClip';

// Estado de reproducción
export interface PlaybackState {
  isPlaying: boolean;
  error?: string;
  currentTime?: number;
  duration?: number;
}

// Estructura del evento
export interface MItemEvent {
  itemId: number;
  type: MItemType;
  action: MItemEventType;
  state?: PlaybackState;
  error?: string;
}

class EventBus {
  private static instance: EventBus;
  private emitter: EventEmitter;

  private constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(50);
    Logger.info('EventBus', 'Initialize', 'EventBus initialized');
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  emit(event: MItemEvent) {
    Logger.info('EventBus', 'Emit', `Emitting event for item ${event.itemId}`, {
      type: event.type,
      action: event.action,
      state: event.state,
      error: event.error
    });
    
    this.emitter.emit('mitem-event', event);
  }

  subscribe(callback: (event: MItemEvent) => void): () => void {
    Logger.info('EventBus', 'Subscribe', 'New subscriber added');
    
    const wrappedCallback = (event: MItemEvent) => {
      Logger.debug('EventBus', 'Handle', `Subscriber handling event for item ${event.itemId}`, {
        type: event.type,
        action: event.action
      });
      callback(event);
    };

    this.emitter.on('mitem-event', wrappedCallback);
    
    return () => {
      Logger.info('EventBus', 'Unsubscribe', 'Subscriber removed');
      this.emitter.off('mitem-event', wrappedCallback);
    };
  }
}

export default EventBus.getInstance();