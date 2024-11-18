"use client";

import React, { useState } from 'react';
import { Play, Square } from 'lucide-react';
import { cn } from "@/lib/utils";
import { MEventUnion } from '@/lib/types/event';
import MEventUnionSelector from './MEventUnionSelector';
import { updateEventUnion } from '@/app/actions/events';
import { useToast } from '@/components/ui/use-toast';

interface MEventUnionProps {
  eventId: number;
  union: MEventUnion;
  isActive: boolean;
  onToggle: () => void;
  onUnionUpdate: (newUnion: MEventUnion) => void;
}

export function MEventUnionComponent({
  eventId,
  union,
  isActive,
  onToggle,
  onUnionUpdate
}: MEventUnionProps) {
  const [showSelector, setShowSelector] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const backgroundColor = isActive ? 'bg-blue-600' : 'bg-gray-700';

  const handleUnionSelect = async (selectedUnion: MEventUnion) => {
    try {
      setIsUpdating(true);
      const result = await updateEventUnion(eventId, selectedUnion.id);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      onUnionUpdate(selectedUnion);
      
      toast({
        title: "Union updated",
        description: "Event union has been updated successfully"
      });
    } catch (error) {
      console.error('Error updating union:', error);
      toast({
        title: "Error",
        description: "Failed to update event union",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
      setShowSelector(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-[1px] h-8 w-16">
        <div
          className={cn(
            "flex items-center justify-center rounded cursor-pointer hover:bg-gray-600 transition-colors",
            backgroundColor,
            isUpdating && "opacity-50 cursor-wait"
          )}
          style={{ height: '100%', width: '100%' }}
          onDoubleClick={() => !isUpdating && setShowSelector(true)}
        >
          <div
            className="h-5 w-5"
            dangerouslySetInnerHTML={{ __html: union.icon }}
          />
        </div>
        <div
          className={cn(
            "flex items-center justify-center rounded",
            backgroundColor
          )}
          style={{ height: '100%', width: '100%' }}
        >
          <button
            onClick={onToggle}
            className="flex items-center justify-center p-1 rounded transition-colors hover:bg-opacity-80"
            disabled={isUpdating}
          >
            {isActive ? (
              <Square size={16} className="fill-current" />
            ) : (
              <Play size={16} className="fill-current" />
            )}
          </button>
        </div>
      </div>

      <MEventUnionSelector
        isOpen={showSelector}
        onClose={() => setShowSelector(false)}
        onSelect={handleUnionSelect}
        currentUnion={union}
      />
    </>
  );
}