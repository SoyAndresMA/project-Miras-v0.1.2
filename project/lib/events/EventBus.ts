import { EventEmitter } from 'events';

export type MItemEventType = 'PLAY' | 'STOP' | 'STATE_CHANGE';

export interface MItemEvent {
  itemId: number;
  type: string;
  action: MItemEventType;
  state?: any;
}

class EventBus {
  private static instance: EventBus;
  private emitter: EventEmitter;

  private constructor() {
    this.emitter = new EventEmitter();
    // Increase max listeners to handle multiple items
    this.emitter.setMaxListeners(50);
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  emit(event: MItemEvent) {
    this.emitter.emit('mitem-event', event);
  }

  subscribe(callback: (event: MItemEvent) => void): () => void {
    this.emitter.on('mitem-event', callback);
    return () => this.emitter.off('mitem-event', callback);
  }
}

export default EventBus.getInstance();