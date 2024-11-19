import { CasparClip, GridPosition, PlaybackState } from '../../types/item';
import { CasparServer } from '../../server/CasparServer';
import { Logger } from '../../utils/logger';

export class CasparClipImpl implements CasparClip {
  private state: PlaybackState = { isPlaying: false };
  private logger: Logger;

  constructor(
    public readonly id: number,
    public readonly type: 'casparClip',
    public readonly position: GridPosition,
    public readonly filePath: string,
    public readonly channel: number,
    public readonly layer: number,
    public readonly loop: boolean,
    public readonly autoStart: boolean,
    private readonly server: CasparServer
  ) {
    this.logger = new Logger('CasparClip');
  }

  public async execute(): Promise<void> {
    try {
      await this.server.play({
        channel: this.channel,
        layer: this.layer,
        file: this.filePath,
        loop: this.loop,
      });
      this.state = { isPlaying: true };
    } catch (error) {
      this.state = { isPlaying: false, error: error.message };
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      await this.server.stop(this.channel, this.layer);
      this.state = { isPlaying: false };
    } catch (error) {
      this.state = { isPlaying: false, error: error.message };
      throw error;
    }
  }

  public getState(): PlaybackState {
    return this.state;
  }

  public async seek(position: number): Promise<void> {
    try {
      await this.server.seek(this.channel, this.layer, position);
    } catch (error) {
      this.logger.error('Failed to seek:', error);
      throw error;
    }
  }

  public async setVolume(volume: number): Promise<void> {
    try {
      await this.server.setVolume(this.channel, this.layer, volume);
    } catch (error) {
      this.logger.error('Failed to set volume:', error);
      throw error;
    }
  }
}
