import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import { Channel } from '../Channel';
import { ServerStateData } from '../types';

export class StateManager extends EventEmitter {
  private state: ServerStateData = {
    version: '',
    channels: new Map(),
    lastUpdate: 0
  };

  private updateInterval: NodeJS.Timeout | null = null;
  private updateAttempts: number = 0;
  private readonly MAX_UPDATE_ATTEMPTS = 3;
  private readonly UPDATE_INTERVAL = 10000;
  private readonly RETRY_DELAY = 30000;

  constructor(private logger: Logger) {
    super();
  }

  startStatusUpdates(): void {
    if (this.updateInterval) {
      this.stopStatusUpdates();
    }

    this.updateAttempts = 0;
    this.scheduleNextUpdate();
  }

  stopStatusUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private scheduleNextUpdate(): void {
    this.updateInterval = setInterval(() => {
      this.emit('requestUpdate');
    }, this.UPDATE_INTERVAL);
  }

  updateVersion(version: string): void {
    this.state.version = version;
    this.state.lastUpdate = Date.now();
    this.emit('stateChanged', this.state);
  }

  updateChannelState(channelId: number, state: any): void {
    if (!this.state.channels.has(channelId)) {
      this.state.channels.set(channelId, new Channel(channelId));
    }
    
    const channel = this.state.channels.get(channelId);
    if (channel) {
      channel.updateState(state);
      this.state.lastUpdate = Date.now();
      this.emit('stateChanged', this.state);
    }
  }

  getState(): ServerStateData {
    return this.state;
  }

  resetState(): void {
    this.state = {
      version: '',
      channels: new Map(),
      lastUpdate: 0
    };
    this.emit('stateChanged', this.state);
  }

  setVersion(version: string): void {
    this.state.version = version;
  }

  addChannel(channel: Channel): void {
    this.state.channels.set(channel.id, channel);
  }

  updateSuccess(): void {
    this.updateAttempts = 0;
    this.state.lastUpdate = Date.now();
  }

  updateFailed(): void {
    if (this.updateAttempts >= this.MAX_UPDATE_ATTEMPTS) {
      this.logger.warn('Máximo número de intentos alcanzado, esperando antes de reintentar');
    }
  }
}
