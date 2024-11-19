import { CasparClip } from '@/lib/types/item';
import EventBus, { MItemEvent, PlaybackState } from '@/lib/events/EventBus';
import Logger from '@/lib/utils/logger';
import { CasparServer } from '@/server/device/caspar/CasparServer';
import { CasparClipRepository } from '@/lib/repositories/CasparClipRepository';

export class CasparClipImpl implements CasparClip {
  readonly id: number;
  readonly type = 'casparClip' as const;
  readonly eventId: number;
  readonly name: string;
  readonly filePath: string;
  readonly channel: number;
  readonly layer: number;
  readonly loop: boolean;
  readonly autoStart: boolean;
  readonly position: { row: number; column: number };
  readonly transition?: { type: string; duration: number };
  
  private state: PlaybackState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0
  };
  
  private server: CasparServer;
  private repository: CasparClipRepository;

  constructor(
    clip: CasparClip,
    server: CasparServer,
    repository: CasparClipRepository
  ) {
    this.id = clip.id;
    this.eventId = clip.eventId;
    this.name = clip.name;
    this.filePath = clip.filePath;
    this.channel = clip.channel;
    this.layer = clip.layer;
    this.loop = clip.loop;
    this.autoStart = clip.autoStart;
    this.position = clip.position;
    this.transition = clip.transition;

    this.server = server;
    this.repository = repository;
    
    Logger.info('CasparClip', 'Initialize', `Clip initialized with ID: ${this.id}`, {
      clipPath: this.filePath
    });
    
    // Suscribirse a eventos
    EventBus.subscribe(this.handleEvent.bind(this));
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