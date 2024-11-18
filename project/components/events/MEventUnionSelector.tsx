"use client";

import React, { useEffect, useState } from 'react';
import { MEventUnion } from '@/lib/types/event';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface MEventUnionSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (union: MEventUnion) => void;
  currentUnion?: MEventUnion;
}

export default function MEventUnionSelector({
  isOpen,
  onClose,
  onSelect,
  currentUnion
}: MEventUnionSelectorProps) {
  const [unions, setUnions] = useState<MEventUnion[]>([]);
  const [selectedUnion, setSelectedUnion] = useState<MEventUnion | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/unions')
        .then(res => res.json())
        .then(data => setUnions(data))
        .catch(err => console.error('Error loading unions:', err));
    }
  }, [isOpen]);

  const handleSelect = () => {
    if (selectedUnion) {
      onSelect(selectedUnion);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 text-gray-100 border-gray-700">
        <DialogHeader>
          <DialogTitle>Select Event Union</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 p-2">
            {unions.map((union) => (
              <button
                key={union.id}
                onClick={() => setSelectedUnion(union)}
                className={`
                  p-2 rounded-lg transition-colors
                  ${selectedUnion?.id === union.id 
                    ? 'bg-blue-600 hover:bg-blue-500' 
                    : 'bg-gray-700 hover:bg-gray-600'}
                `}
                title={union.name}
              >
                <div
                  className="w-8 h-8"
                  dangerouslySetInnerHTML={{ __html: union.icon }}
                />
                <div className="text-xs mt-1 text-center">{union.name}</div>
              </button>
            ))}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSelect}
              disabled={!selectedUnion}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}