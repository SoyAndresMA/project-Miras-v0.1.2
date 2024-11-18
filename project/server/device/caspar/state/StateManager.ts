import { EventEmitter } from 'events';
import { ServerStateData } from '../types';
import { Channel } from '../Channel';
import { Logger } from '../utils/Logger';

export class StateManager extends EventEmitter {
  private version: string | null = null;
  private channels: Map<number, Channel> = new Map();
  private statusInterval: NodeJS.Timeout | null = null;
  private updateInterval: number;

  constructor(
    private logger: Logger,
    updateInterval: number = 1000
  ) {
    super();
    this.updateInterval = updateInterval;
  }

  startStatusUpdates(): void {
    if (this.statusInterval) {
      this.logger.warn('⚠️ Estado ya está siendo actualizado');
      return;
    }

    this.statusInterval = setInterval(() => {
      this.emit('statusUpdate');
    }, this.updateInterval);
  }

  stopStatusUpdates(): void {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
  }

  setVersion(version: string): void {
    this.version = version;
    this.emit('versionChanged', version);
  }

  addChannel(channel: Channel): void {
    this.channels.set(channel.number, channel);
    this.emit('channelAdded', channel);
  }

  removeChannel(channelNumber: number): void {
    const channel = this.channels.get(channelNumber);
    if (channel) {
      this.channels.delete(channelNumber);
      this.emit('channelRemoved', channel);
    }
  }

  getChannel(channelNumber: number): Channel | undefined {
    return this.channels.get(channelNumber);
  }

  getAllChannels(): Channel[] {
    return Array.from(this.channels.values());
  }

  clearState(): void {
    this.version = null;
    this.channels.clear();
    this.emit('stateCleared');
  }

  getState(): ServerStateData {
    return {
      connected: true,
      version: this.version,
      channels: this.getAllChannels()
    };
  }
}
