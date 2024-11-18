import EventBus, { MItemEvent } from '../events/EventBus';
import { CasparMClip } from '@/server/items/CasparMClip';
import { CasparServer } from '@/server/device/CasparServer';

class MItemEventHandler {
  private static instance: MItemEventHandler;
  private items: Map<number, CasparMClip> = new Map();
  private server: CasparServer;

  private constructor() {
    // Initialize CasparServer with default config
    this.server = CasparServer.getInstance({
      id: 1,
      name: 'Local Server',
      host: 'localhost',
      port: 5250,
      active: true
    });

    // Subscribe to events
    EventBus.subscribe(this.handleEvent.bind(this));
  }

  public static getInstance(): MItemEventHandler {
    if (!MItemEventHandler.instance) {
      MItemEventHandler.instance = new MItemEventHandler();
    }
    return MItemEventHandler.instance;
  }

  registerItem(item: CasparMClip) {
    this.items.set(item.id, item);
  }

  unregisterItem(itemId: number) {
    this.items.delete(itemId);
  }

  private async handleEvent(event: MItemEvent) {
    const item = this.items.get(event.itemId);
    if (!item) return;

    try {
      switch (event.action) {
        case 'PLAY':
          await item.execute();
          break;
        case 'STOP':
          await item.stop();
          break;
      }
    } catch (error) {
      console.error(`Error handling ${event.action} for item ${event.itemId}:`, error);
    }
  }
}

export default MItemEventHandler.getInstance();