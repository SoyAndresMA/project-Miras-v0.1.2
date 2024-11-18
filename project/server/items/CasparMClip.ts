import { MItem, MItemType, MItemState } from '@/lib/types/item';
import { CasparMClipConfig } from '@/lib/types/item';
import { CasparServer } from '../device/CasparServer';
import EventBus from '@/lib/events/EventBus';
import MItemEventHandler from '@/lib/handlers/MItemEventHandler';

export class CasparMClip implements MItem {
  id: number;
  type: MItemType = 'casparMClip';
  position_row: number;
  position_column: number;
  state: MItemState = { isPlaying: false };
  private config: CasparMClipConfig;
  private server: CasparServer;

  constructor(
    config: CasparMClipConfig,
    position: { row: number; column: number },
    server: CasparServer
  ) {
    this.id = config.id;
    this.position_row = position.row;
    this.position_column = position.column;
    this.config = config;
    this.server = server;

    // Register this item with the event handler
    MItemEventHandler.registerItem(this);

    // Subscribe to server status changes
    this.server.onStatusChange((status) => {
      const layerStatus = status.channels[this.config.channel]?.layers[this.config.layer];
      if (layerStatus) {
        this.updateState({
          isPlaying: layerStatus.status === 'playing'
        });
      }
    });
  }

  private updateState(newState: Partial<MItemState>) {
    this.state = { ...this.state, ...newState };
    EventBus.emit({
      itemId: this.id,
      type: this.type,
      action: 'STATE_CHANGE',
      state: this.state
    });
  }

  async execute(): Promise<void> {
    if (!this.server.isConnected()) {
      this.updateState({ 
        isPlaying: false, 
        error: 'CasparCG server not connected' 
      });
      throw new Error('CasparCG server not connected');
    }

    try {
      // Here we send the actual PLAY command to CasparCG
      await this.server.play(
        this.config.channel,
        this.config.layer,
        this.config.file_path
      );
      this.updateState({ isPlaying: true, error: undefined });
    } catch (error) {
      this.updateState({ 
        isPlaying: false, 
        error: 'Failed to execute clip' 
      });
      console.error('Failed to execute CasparMClip:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.server.isConnected()) {
      this.updateState({ 
        isPlaying: false, 
        error: 'CasparCG server not connected' 
      });
      throw new Error('CasparCG server not connected');
    }

    try {
      // Here we send the actual STOP command to CasparCG
      await this.server.stop(
        this.config.channel,
        this.config.layer
      );
      this.updateState({ isPlaying: false, error: undefined });
    } catch (error) {
      this.updateState({ 
        error: 'Failed to stop clip' 
      });
      console.error('Failed to stop CasparMClip:', error);
      throw error;
    }
  }
}