import React, { useEffect, useState, useCallback } from 'react';
import { Play, Square, AlertCircle } from 'lucide-react';
import { cn } from "@/lib/utils";
import MItemUnion from './MItemUnion';
import { CasparClip as CasparClipType, MItemUnion as MItemUnionType } from '@/lib/types/item';
import EventBus, { MItemEvent, PlaybackState } from '@/lib/events/EventBus';
import Logger from '../../lib/utils/logger';
import { useToast } from "@/components/ui/use-toast";
import { useMainLayout } from "@/hooks/useMainLayout";

interface CasparClipProps {
  item: CasparClipType;
  isActive?: boolean;
  onToggle?: () => void;
  onUnionUpdate?: (id: number, union: MItemUnionType) => void;
  uniqueKey?: string;
}

function CasparClip({
  item,
  isActive = false,
  onToggle,
  onUnionUpdate,
  uniqueKey
}: CasparClipProps) {
  // Estado local
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0
  });
  
  const { toast } = useToast();
  const { actions } = useMainLayout();

  // Manejar eventos del EventBus
  const handleEvent = useCallback((event: MItemEvent) => {
    if (event.itemId !== item.id) return;

    Logger.getInstance().debug('CasparClipUI', 'HandleEvent', `Received event for item ${item.id}`, event);

    switch (event.action) {
      case 'STATE_CHANGE':
        if (event.state) {
          Logger.getInstance().info('CasparClipUI', 'StateUpdate', `Updating state for item ${item.id}`, event.state);
          setPlaybackState(event.state);
          
          if (event.state.isPlaying) {
            actions.setDynamicInfo(`Playing: ${item.name}`);
          } else {
            actions.setDynamicInfo('');
          }
        }
        break;

      case 'ERROR':
        Logger.getInstance().error('CasparClipUI', 'Error', `Error in item ${item.id}: ${event.error}`);
        toast({
          title: "Error",
          description: event.error,
          variant: "destructive"
        });
        break;
    }
  }, [item.id, item.name, actions, toast]);

  // Suscribirse a eventos
  useEffect(() => {
    Logger.getInstance().info('CasparClipUI', 'Mount', `Component mounted for item ${item.id}`);
    const unsubscribe = EventBus.getInstance().subscribe(handleEvent);
    
    return () => {
      Logger.getInstance().info('CasparClipUI', 'Unmount', `Component unmounting for item ${item.id}`);
      unsubscribe();
    };
  }, [item.id, handleEvent]);

  // Manejar clic en botón play/pause
  const handlePlayPause = useCallback(() => {
    Logger.getInstance().info('CasparClipUI', 'UserAction', `Play/Pause clicked for item ${item.id}`);
    
    // Mostrar mensaje en la barra superior
    actions.setDynamicInfo(`Click PLAY: ${item.name}`);
    
    const event: MItemEvent = {
      itemId: item.id,
      type: 'casparClip',
      action: playbackState.isPlaying ? 'STOP' : 'PLAY',
      state: playbackState
    };

    Logger.getInstance().debug('CasparClipUI', 'EmitEvent', `Emitting ${event.action} event`, event);
    EventBus.getInstance().emit(event);

    onToggle?.();
  }, [item.id, item.name, playbackState, onToggle, actions]);

  // Manejar actualización de unión
  const handleUnionUpdate = useCallback((newUnion: MItemUnionType) => {
    onUnionUpdate?.(item.id, newUnion);
  }, [item.id, onUnionUpdate]);

  const backgroundColor = isActive ? 'bg-blue-600' : 'bg-gray-700';

  return (
    <div className="flex-none flex h-8 w-[210px] [&>*:first-child]:mr-[1px]">
      {item.union && (
        <MItemUnion
          key={`union-${uniqueKey || item.id}`}
          itemId={item.id}
          union={item.union}
          isActive={isActive}
          onUnionUpdate={handleUnionUpdate}
          itemType="casparClip"
        />
      )}

      <div 
        className={cn(
          "flex items-center text-white rounded flex-grow",
          backgroundColor,
          playbackState.error && "border-red-500 border"
        )}
      >
        <button
          onClick={handlePlayPause}
          className="flex items-center justify-center h-8 w-8 rounded transition-colors hover:bg-opacity-80"
        >
          {playbackState.error ? (
            <AlertCircle size={20} className="text-red-500" />
          ) : playbackState.isPlaying ? (
            <Square size={20} className="fill-current" />
          ) : (
            <Play size={20} className="fill-current" />
          )}
        </button>

        <span className="text-sm whitespace-nowrap overflow-hidden overflow-ellipsis pr-3">
          {item.name}
        </span>
      </div>
    </div>
  );
}

export { CasparClip };

export default CasparClip;
