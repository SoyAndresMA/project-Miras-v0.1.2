"use client";

import React, { useEffect, useState } from 'react';
import { Play, Square, AlertCircle } from 'lucide-react';
import { cn } from "@/lib/utils";
import MItemUnion from './MItemUnion';
import { MItemUnion as MItemUnionType } from '@/lib/types/item';
import EventBus, { MItemEvent } from '@/lib/events/EventBus';
import { useToast } from "@/components/ui/use-toast";

interface CasparMClipProps {
  item: {
    id: number;
    title: string;
    munion?: MItemUnionType;
  };
  isActive?: boolean;
  onToggle?: () => void;
  onUnionUpdate?: (itemId: number, union: MItemUnionType) => void;
  uniqueKey?: string;
}

export default function CasparMClip({
  item,
  isActive = false,
  onToggle,
  onUnionUpdate,
  uniqueKey
}: CasparMClipProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const { toast } = useToast();

  useEffect(() => {
    // Subscribe to state changes for this item
    const unsubscribe = EventBus.subscribe((event: MItemEvent) => {
      if (event.itemId === item.id && event.action === 'STATE_CHANGE') {
        setIsPlaying(event.state.isPlaying);
        setError(event.state.error);

        if (event.state.error) {
          toast({
            title: "Error",
            description: event.state.error,
            variant: "destructive"
          });
        }
      }
    });

    return () => unsubscribe();
  }, [item.id, toast]);

  const handlePlayPause = () => {
    EventBus.emit({
      itemId: item.id,
      type: 'casparMClip',
      action: isPlaying ? 'STOP' : 'PLAY'
    });
    onToggle?.();
  };

  const handleUnionUpdate = (newUnion: MItemUnionType) => {
    onUnionUpdate?.(item.id, newUnion);
  };

  const backgroundColor = isActive ? 'bg-blue-600' : 'bg-gray-700';

  return (
    <div className="flex-none flex h-8 w-[210px] [&>*:first-child]:mr-[1px]">
      {item.munion && (
        <MItemUnion
          key={`union-${uniqueKey || item.id}`}
          itemId={item.id}
          union={item.munion}
          isActive={isActive}
          onUnionUpdate={handleUnionUpdate}
          itemType="casparMClip"
        />
      )}

      <div 
        className={cn(
          "flex items-center text-white rounded flex-grow",
          backgroundColor,
          error && "border-red-500 border"
        )}
      >
        <button
          onClick={handlePlayPause}
          className="flex items-center justify-center h-8 w-8 rounded transition-colors hover:bg-opacity-80"
        >
          {error ? (
            <AlertCircle size={20} className="text-red-500" />
          ) : isPlaying ? (
            <Square size={20} className="fill-current" />
          ) : (
            <Play size={20} className="fill-current" />
          )}
        </button>

        <span className="text-sm whitespace-nowrap overflow-hidden overflow-ellipsis pr-3">
          {item.title}
        </span>
      </div>
    </div>
  );
}