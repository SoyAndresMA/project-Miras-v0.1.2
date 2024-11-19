import { MItem, MItemType } from '@/lib/types/item';
import { CasparMClipConfig } from '@/lib/types/item';
import EventBus, { MItemEvent, PlaybackState } from '@/lib/events/EventBus';
import Logger from '@/lib/utils/logger';
import { CasparServer } from '@/server/device/caspar/CasparServer';

export class CasparMClip implements MItem {
  id: number;
  type: MItemType = 'casparMClip';
  position_row: number;
  position_column: number;
  
  private state: PlaybackState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0
  };
  
  private config: CasparMClipConfig;
  private server: CasparServer;

  constructor(config: CasparMClipConfig) {
    this.id = config.id;
    this.position_row = config.position_row;
    this.position_column = config.position_column;
    
    this.config = {
      id: config.id,
      name: config.name,
      file_path: config.file_path,
      channel: config.channel || 1,
      layer: config.layer || 10,
      loop: config.loop || false,
      transition_type: config.transition_type || 'cut',
      transition_duration: config.transition_duration || 0,
      auto_start: config.auto_start || false
    };

    Logger.info('CasparMClip', 'Initialize', `Clip initialized with ID: ${this.id}`, {
      clipPath: this.config.file_path
    });

    // Obtener instancia del servidor CasparCG
    this.server = CasparServer.getInstance();
    
    // Suscribirse a eventos
    EventBus.subscribe(this.handleEvent.bind(this));
  }

  private handleEvent = (event: MItemEvent) => {
    // Solo procesar eventos para este clip
    if (event.itemId !== this.id) return;

    Logger.debug('CasparMClip', 'HandleEvent', `Processing ${event.action} event for clip ${this.id}`, event);

    switch (event.action) {
      case 'PLAY':
        this.play();
        break;
      case 'STOP':
        this.stop();
        break;
    }
  };

  private emitEvent(action: MItemEvent['action'], error?: string) {
    const event: MItemEvent = {
      itemId: this.id,
      type: 'casparMClip',
      action,
      state: this.state,
      error
    };
    
    Logger.debug('CasparMClip', 'EmitEvent', `Emitting ${action} event for clip ${this.id}`, event);
    EventBus.emit(event);
  }

  async play() {
    try {
      Logger.info('CasparMClip', 'Play', `Starting playback for clip ${this.id}`);
      
      // Verificar que el archivo existe
      if (!this.config.file_path) {
        throw new Error('No file path specified');
      }

      // Intentar reproducir
      await this.server.play({
        channel: this.config.channel,
        layer: this.config.layer,
        file: this.config.file_path,
        loop: this.config.loop,
        transition: {
          type: this.config.transition_type,
          duration: this.config.transition_duration
        }
      });

      // Actualizar estado
      this.state = {
        ...this.state,
        isPlaying: true,
        error: undefined
      };
      
      Logger.info('CasparMClip', 'Play', `Playback started successfully for clip ${this.id}`);
      this.emitEvent('STATE_CHANGE');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during playback';
      Logger.error('CasparMClip', 'Play', errorMessage, error);
      
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
      Logger.info('CasparMClip', 'Stop', `Stopping playback for clip ${this.id}`);

      // Solo intentar detener si está reproduciendo
      if (!this.state.isPlaying) {
        Logger.info('CasparMClip', 'Stop', `Clip ${this.id} is not playing`);
        return;
      }

      // Intentar detener
      await this.server.stop(
        this.config.channel,
        this.config.layer
      );

      // Actualizar estado
      this.state = {
        ...this.state,
        isPlaying: false,
        error: undefined
      };
      
      Logger.info('CasparMClip', 'Stop', `Playback stopped successfully for clip ${this.id}`);
      this.emitEvent('STATE_CHANGE');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during stop';
      Logger.error('CasparMClip', 'Stop', errorMessage, error);
      
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