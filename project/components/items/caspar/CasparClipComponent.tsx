import React from 'react';
import { Play, Square, AlertCircle, Volume2 } from 'lucide-react';
import { CasparClip } from '@/lib/types/item';
import { BaseItemComponent, BaseItemProps } from '../base/BaseItemComponent';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { formatDuration } from '@/lib/utils/time';

interface CasparClipProps extends BaseItemProps<CasparClip> {
  onVolumeChange?: (volume: number) => void;
}

export class CasparClipComponent extends BaseItemComponent<CasparClip, CasparClipProps> {
  private async handleVolumeChange(value: number[]): Promise<void> {
    try {
      await this.props.item.setVolume(value[0]);
      this.props.onVolumeChange?.(value[0]);
    } catch (error) {
      this.handleError(error);
    }
  }

  protected renderControls(): React.ReactNode {
    const { playbackState } = this.state;
    const { item } = this.props;

    return (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => playbackState.isPlaying ? this.handleStop() : this.handleExecute()}
        >
          {playbackState.isPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4" />
          <Slider
            defaultValue={[1]}
            max={1}
            step={0.1}
            onValueChange={this.handleVolumeChange.bind(this)}
          />
        </div>
      </div>
    );
  }

  protected renderContent(): React.ReactNode {
    const { item } = this.props;
    const { playbackState } = this.state;

    return (
      <>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium">{item.filePath.split('/').pop()}</h3>
            <p className="text-sm text-muted-foreground">
              Channel: {item.channel}, Layer: {item.layer}
            </p>
          </div>
          {playbackState.error && (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
        </div>

        {(playbackState.currentTime !== undefined && playbackState.duration) && (
          <div className="text-sm text-muted-foreground">
            {formatDuration(playbackState.currentTime)} / {formatDuration(playbackState.duration)}
          </div>
        )}
      </>
    );
  }
}
