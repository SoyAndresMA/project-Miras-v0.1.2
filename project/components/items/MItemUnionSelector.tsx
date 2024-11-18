"use client";

import React, { useEffect, useState } from 'react';
import { MItemUnion } from '@/lib/types/item';
import { cn } from "@/lib/utils";

interface MItemUnionSelectorProps {
  isOpen: boolean;
  onSelect: (union: MItemUnion) => void;
  currentUnion?: MItemUnion;
  itemType: string;
}

export default function MItemUnionSelector({
  isOpen,
  onSelect,
  currentUnion,
  itemType
}: MItemUnionSelectorProps) {
  const [unions, setUnions] = useState<MItemUnion[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch(`/api/item-unions?type=${itemType}`)
        .then(res => res.json())
        .then(data => setUnions(data))
        .catch(err => {
          console.error('Error loading item unions:', err);
          setError('Failed to load unions');
        });
    }
  }, [isOpen, itemType]);

  if (error) {
    return <div className="text-red-400 text-sm p-2">{error}</div>;
  }

  return (
    <>
      {unions.map((union) => (
        <button
          key={union.id}
          onClick={() => onSelect(union)}
          className={cn(
            "p-2 rounded-lg transition-colors",
            currentUnion?.id === union.id 
              ? 'bg-blue-600 hover:bg-blue-500' 
              : 'bg-gray-700 hover:bg-gray-600'
          )}
          title={union.name}
        >
          <div
            className="w-8 h-8"
            dangerouslySetInnerHTML={{ __html: union.icon }}
          />
          <div className="text-xs mt-1 text-center">{union.name}</div>
        </button>
      ))}
    </>
  );
}