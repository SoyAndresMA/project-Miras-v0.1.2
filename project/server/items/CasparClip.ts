import { CasparClip } from '@/lib/types/item';
import EventBus, { MItemEvent, PlaybackState } from '@/lib/events/EventBus';
import Logger from '@/lib/utils/logger';
import { CasparServer } from '@/server/device/caspar/CasparServer';
import { CasparClipRepository } from '@/lib/repositories/CasparClipRepository';

class CasparClipImpl implements CasparClip {
  private state: PlaybackState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0
  };

  private server: CasparServer;
  private repository: CasparClipRepository;

  constructor(
    private config: {
      id: number;
      eventId: number;
      name: string;
      file_path: string;
      position_row: number;
      position_column: number;
      channel: number;
      layer: number;
      loop: boolean;
      transition_type: string;
      transition_duration: number;
      auto_start: boolean;
    },
    server: CasparServer,
    repository: CasparClipRepository
  ) {
    this.server = server;
    this.repository = repository;
    
    Logger.getInstance().info('CasparClip', 'Constructor', `Initializing clip with ID: ${this.id}`, {
      clipConfig: this.config,
      hasServer: !!server,
      hasRepository: !!repository
    });
    
    // Suscribirse a eventos
    EventBus.getInstance().subscribe(this.handleEvent.bind(this));
  }

  get id(): number {
    return this.config.id;
  }

  get eventId(): number {
    return this.config.eventId;
  }

  get name(): string {
    return this.config.name;
  }

  get filePath(): string {
    return this.config.file_path;
  }

  get channel(): number {
    return this.config.channel;
  }

  get layer(): number {
    return this.config.layer;
  }

  get loop(): boolean {
    return this.config.loop;
  }

  get autoStart(): boolean {
    return this.config.auto_start;
  }

  get transition() {
    return {
      type: this.config.transition_type,
      duration: this.config.transition_duration
    };
  }

  get position() {
    return {
      row: this.config.position_row,
      column: this.config.position_column
    };
  }

  private handleEvent(event: MItemEvent) {
    if (event.itemId !== this.id) return;

    Logger.getInstance().info('CasparClip', 'HandleEvent', `Handling event for clip ${this.id}`, {
      eventType: event.type,
      action: event.action,
      itemId: event.itemId
    });

    // Manejar eventos del frontend
    switch (event.action) {
      case 'PLAY':
        this.play();
        break;
      case 'STOP':
        this.stop();
        break;
      case 'PAUSE':
        this.pause();
        break;
      default:
        Logger.getInstance().warn('CasparClip', 'HandleEvent', `Unknown action: ${event.action}`);
    }
  }

  async play() {
    try {
      Logger.getInstance().info('CasparClip', 'Play', `Playing clip ${this.id}`, {
        clipName: this.filePath,  
        channel: this.channel,
        layer: this.layer
      });

      if (!this.server) {
        throw new Error('No CasparCG server available');
      }

      await this.server.play({
        channel: this.channel,
        layer: this.layer,
        file: this.filePath,  
        loop: this.loop,
        transition: {
          type: this.transition.type,
          duration: this.transition.duration
        }
      });

      this.state.isPlaying = true;
      EventBus.getInstance().emit({
        type: 'playbackStateChanged',
        itemId: this.id,
        state: this.state
      });

    } catch (error) {
      Logger.getInstance().error('CasparClip', 'Play', `Error playing clip ${this.id}`, error);
      throw error;
    }
  }

  async stop() {
    try {
      Logger.getInstance().info('CasparClip', 'Stop', `Stopping clip ${this.id}`);

      if (!this.server) {
        throw new Error('No CasparCG server available');
      }

      await this.server.stop({
        channel: this.channel,
        layer: this.layer
      });

      this.state.isPlaying = false;
      this.state.currentTime = 0;
      EventBus.getInstance().emit({
        type: 'playbackStateChanged',
        itemId: this.id,
        state: this.state
      });

    } catch (error) {
      Logger.getInstance().error('CasparClip', 'Stop', `Error stopping clip ${this.id}`, error);
      throw error;
    }
  }

  async pause() {
    try {
      Logger.getInstance().info('CasparClip', 'Pause', `Pausing clip ${this.id}`);

      if (!this.server) {
        throw new Error('No CasparCG server available');
      }

      await this.server.pause({
        channel: this.channel,
        layer: this.layer
      });

      this.state.isPlaying = false;
      EventBus.getInstance().emit({
        type: 'playbackStateChanged',
        itemId: this.id,
        state: this.state
      });

    } catch (error) {
      Logger.getInstance().error('CasparClip', 'Pause', `Error pausing clip ${this.id}`, error);
      throw error;
    }
  }
}

export { CasparClipImpl as CasparClip };