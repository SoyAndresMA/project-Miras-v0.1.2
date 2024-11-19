import { CasparClip } from '@/lib/types/item';
import EventBus, { MItemEvent, PlaybackState } from '@/lib/events/EventBus';
import Logger from '@/lib/utils/logger';
import { CasparServer } from '@/server/device/caspar/CasparServer';
import { CasparClipRepository } from '@/lib/repositories/CasparClipRepository';

export class CasparClipImpl implements CasparClip {
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
    
    Logger.info('CasparClip', 'Initialize', `Clip initialized with ID: ${this.id}`, {
      clipPath: this.filePath
    });
    
    // Suscribirse a eventos
    EventBus.subscribe(this.handleEvent.bind(this));
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

  get transition(): { type: string; duration: number } {
    return {
      type: this.config.transition_type,
      duration: this.config.transition_duration
    };
  }

  get autoStart(): boolean {
    return this.config.auto_start;
  }

  get position(): { row: number; column: number } {
    return {
      row: this.config.position_row,
      column: this.config.position_column
    };
  }

  private handleEvent = (event: MItemEvent) => {
    // Solo procesar eventos para este clip
    if (event.itemId !== this.id) return;

    Logger.debug('CasparClip', 'HandleEvent', `Processing ${event.action} event for clip ${this.id}`, event);

    switch (event.action) {
      case 'PLAY':
        this.execute();
        break;
      case 'STOP':
        this.stop();
        break;
    }
  };

  async execute() {
    try {
      Logger.info('CasparClip', 'Execute', `Starting playback for clip ${this.id}`);
      
      // Verificar que el archivo existe
      if (!this.filePath) {
        throw new Error('No file path specified');
      }

      // Intentar reproducir
      await this.server.play({
        channel: this.channel,
        layer: this.layer,
        file: this.filePath,
        loop: this.loop,
        transition: this.transition
      });

      // Actualizar estado
      this.state = {
        ...this.state,
        isPlaying: true,
        error: undefined
      };
      
      Logger.info('CasparClip', 'Execute', `Playback started successfully for clip ${this.id}`);
      this.emitEvent('STATE_CHANGE');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during playback';
      Logger.error('CasparClip', 'Execute', errorMessage, error);
      
      // Actualizar estado con error
      this.state = {
        ...this.state,
        isPlaying: false,
        error: errorMessage
      };
      
      this.emitEvent('ERROR', errorMessage);
      throw error;
    }
  }

  private emitEvent(action: MItemEvent['action'], error?: string) {
    const event: MItemEvent = {
      itemId: this.id,
      type: 'casparClip',
      action,
      state: this.state,
      error
    };
    
    Logger.debug('CasparClip', 'EmitEvent', `Emitting ${action} event for clip ${this.id}`, event);
    EventBus.emit(event);
  }

  async stop() {
    try {
      Logger.info('CasparClip', 'Stop', `Stopping playback for clip ${this.id}`);

      // Solo intentar detener si está reproduciendo
      if (!this.state.isPlaying) {
        Logger.info('CasparClip', 'Stop', `Clip ${this.id} is not playing`);
        return;
      }

      // Intentar detener
      await this.server.stop(this.channel, this.layer);

      // Actualizar estado
      this.state = {
        ...this.state,
        isPlaying: false,
        error: undefined
      };
      
      Logger.info('CasparClip', 'Stop', `Playback stopped successfully for clip ${this.id}`);
      this.emitEvent('STATE_CHANGE');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during stop';
      Logger.error('CasparClip', 'Stop', errorMessage, error);
      
      // Actualizar estado con error
      this.state = {
        ...this.state,
        error: errorMessage
      };
      
      this.emitEvent('ERROR', errorMessage);
      throw error;
    }
  }

  getState(): PlaybackState {
    return this.state;
  }
}