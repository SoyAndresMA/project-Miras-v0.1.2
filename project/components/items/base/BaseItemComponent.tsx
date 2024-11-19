import React from 'react';
import { MItem, PlaybackState } from '@/lib/types/item';
import { useToast } from "@/components/ui/use-toast";
import { useMainLayout } from "@/hooks/useMainLayout";
import Logger from '@/lib/utils/logger';

export interface BaseItemProps<T extends MItem> {
  item: T;
  isActive?: boolean;
  onToggle?: () => void;
  uniqueKey?: string;
}

export abstract class BaseItemComponent<T extends MItem, P extends BaseItemProps<T>> 
  extends React.Component<P, { playbackState: PlaybackState }> {
  
  protected logger: Logger;
  protected toast: ReturnType<typeof useToast>['toast'];
  protected actions: ReturnType<typeof useMainLayout>['actions'];

  constructor(props: P) {
    super(props);
    this.state = {
      playbackState: { isPlaying: false }
    };
    this.logger = new Logger(this.constructor.name);
  }

  protected abstract renderControls(): React.ReactNode;
  protected abstract renderContent(): React.ReactNode;

  protected handleError(error: Error): void {
    this.logger.error('Error in item component:', error);
    this.toast({
      variant: "destructive",
      title: "Error",
      description: error.message
    });
  }

  protected async handleExecute(): Promise<void> {
    try {
      await this.props.item.execute();
    } catch (error) {
      this.handleError(error);
    }
  }

  protected async handleStop(): Promise<void> {
    try {
      await this.props.item.stop();
    } catch (error) {
      this.handleError(error);
    }
  }

  public render(): React.ReactNode {
    const { isActive, onToggle } = this.props;
    const { playbackState } = this.state;

    return (
      <div 
        className={`relative p-4 border rounded-lg ${
          isActive ? 'border-primary' : 'border-border'
        }`}
        onClick={onToggle}
      >
        <div className="flex flex-col gap-2">
          {this.renderContent()}
          <div className="flex justify-between items-center">
            {this.renderControls()}
            {playbackState.error && (
              <div className="text-destructive text-sm">
                {playbackState.error}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
