"use client";

import React, { useState } from 'react';
import { cn } from "@/lib/utils";
import { MItemUnion as MItemUnionType } from '@/lib/types/item';
import MItemUnionSelector from './MItemUnionSelector';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateItemUnion } from '@/app/actions/items';
import { useToast } from "@/components/ui/use-toast";

interface MItemUnionProps {
  itemId: number;
  union: MItemUnionType;
  isActive: boolean;
  onUnionUpdate?: (union: MItemUnionType) => void;
  itemType: string;
}

export default function MItemUnion({
  itemId,
  union,
  isActive,
  onUnionUpdate,
  itemType
}: MItemUnionProps) {
  const [showSelector, setShowSelector] = useState(false);
  const [selectedUnion, setSelectedUnion] = useState<MItemUnionType | null>(null);
  const [delay, setDelay] = useState(union.delay?.toString() || "0");
  const [position, setPosition] = useState(union.position?.toString() || "0");
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  
  const backgroundColor = isActive ? 'bg-blue-600' : 'bg-gray-700';

  const handleUnionSelect = (newUnion: MItemUnionType) => {
    setSelectedUnion(newUnion);
  };

  const handleSave = async () => {
    if (!selectedUnion) return;

    try {
      setIsUpdating(true);
      const result = await updateItemUnion(
        itemId,
        selectedUnion.id,
        parseInt(position, 10),
        parseFloat(delay)
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      onUnionUpdate?.(result.item.munion);
      setShowSelector(false);
      setSelectedUnion(null);

      toast({
        title: "Success",
        description: "Item union updated successfully"
      });
    } catch (error) {
      console.error('Error updating item union:', error);
      toast({
        title: "Error",
        description: "Failed to update item union",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <div 
        className="grid grid-rows-1 grid-cols-2 w-[50px] h-full cursor-pointer"
        onDoubleClick={() => !isUpdating && setShowSelector(true)}
      >
        <div 
          className={cn(
            "flex items-center justify-center text-white rounded-l",
            backgroundColor,
            isUpdating && "opacity-50 cursor-wait"
          )}
        >
          <div 
            className="h-4 w-4"
            dangerouslySetInnerHTML={{ __html: union.icon }}
          />
        </div>
        <div 
          className={cn(
            "flex items-center justify-center text-white text-xs font-mono",
            backgroundColor
          )}
        >
          {union.position || '0'}
        </div>
      </div>

      <Dialog open={showSelector} onOpenChange={setShowSelector}>
        <DialogContent className="sm:max-w-[425px] bg-gray-800 text-gray-100 border-gray-700">
          <DialogHeader>
            <DialogTitle>Configure Item Union</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 p-2 max-h-[300px] overflow-y-auto">
              <MItemUnionSelector
                isOpen={true}
                currentUnion={selectedUnion || union}
                onSelect={handleUnionSelect}
                itemType={itemType}
              />
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    type="number"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="bg-gray-700 border-gray-600"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="delay">Delay (seconds)</Label>
                  <Input
                    id="delay"
                    type="number"
                    step="0.1"
                    value={delay}
                    onChange={(e) => setDelay(e.target.value)}
                    className="bg-gray-700 border-gray-600"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={!selectedUnion || isUpdating}
                className="bg-blue-600 hover:bg-blue-500 text-white"
              >
                {isUpdating ? "Saving..." : "Apply"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}