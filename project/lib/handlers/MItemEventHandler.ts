import EventBus, { MItemEvent } from '../events/EventBus';
import { CasparClip } from '@/server/items/CasparClip';
import { CasparServer } from '@/server/device/caspar/CasparServer';

class MItemEventHandler {
  private static instance: MItemEventHandler;
  private items: Map<number, CasparClip> = new Map();
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

  registerItem(item: CasparClip) {
    console.log(`Registering item ${item.id} in MItemEventHandler`);
    this.items.set(item.id, item);
  }

  unregisterItem(itemId: number) {
    console.log(`Unregistering item ${itemId} from MItemEventHandler`);
    this.items.delete(itemId);
  }

  private async handleEvent(event: MItemEvent) {
    console.log(`Handling event for item ${event.itemId}:`, event);
    const item = this.items.get(event.itemId);
    
    if (!item) {
      console.warn(`No item found for id ${event.itemId}`);
      return;
    }

    try {
      switch (event.action) {
        case 'PLAY':
          console.log(`Executing play for item ${event.itemId}`);
          await item.play();
          break;
        case 'STOP':
          console.log(`Executing stop for item ${event.itemId}`);
          await item.stop();
          break;
        default:
          console.log(`Unhandled action ${event.action} for item ${event.itemId}`);
      }
    } catch (error) {
      console.error(`Error handling ${event.action} for item ${event.itemId}:`, error);
    }
  }
}

export default MItemEventHandler.getInstance();