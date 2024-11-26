"use client";

import React, { useState, useCallback } from 'react';
import { Play, Square } from 'lucide-react';
import { MEvent, MEventUnion } from '@/lib/types/event';
import { MEventUnionComponent } from './MEventUnion';
import { CasparClip as CasparClipType } from '@/lib/types/item';
import { CasparClip } from '@/components/items/CasparClip';
import { useMainLayout } from "@/hooks/useMainLayout";
import Logger from '@/lib/utils/logger';

interface MEventProps {
  event: MEvent;
  onEventChange: (eventId: number, updatedEvent: MEvent) => void;
  availableUnions: MEventUnion[];
}

export default function MEventComponent({
  event,
  onEventChange,
  availableUnions
}: MEventProps) {
  const [isActive, setIsActive] = useState(false);
  const [activeRows, setActiveRows] = useState<Record<number, boolean>>({});
  const { actions } = useMainLayout();

  // Función para generar claves únicas
  const generateUniqueKey = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const itemsByRow = React.useMemo(() => {
    const rows: Record<number, CasparClipType[]> = {};
    if (Array.isArray(event.items)) {
      event.items.forEach(item => {
        if (!rows[item.position.row]) {
          rows[item.position.row] = [];
        }
        rows[item.position.row].push(item as CasparClipType);
      });
    }
    return rows;
  }, [event.items]);

  const handleUnionUpdate = (newUnion: MEventUnion) => {
    onEventChange(event.id, {
      ...event,
      munion: newUnion
    });
  };

  const toggleRow = (rowNumber: number) => {
    const newState = !activeRows[rowNumber];
    setActiveRows(prev => ({
      ...prev,
      [rowNumber]: newState
    }));

    // Log the action
    Logger.getInstance().info('MEventUI', 'UserAction', `Row ${rowNumber} ${newState ? 'PLAY' : 'STOP'} clicked in event ${event.id}`);
    
    // Update dynamic info
    actions.setDynamicInfo(`${newState ? 'Playing' : 'Stopped'} row ${rowNumber} in ${event.title}`);
  };

  const renderEmptySlots = (rowNumber: number, rowItems: CasparClipType[] = []) => {
    const slots = [];
    const existingPositions = new Set(rowItems.map(item => item.position.column));
    
    for (let i = 1; i <= 8; i++) {
      if (!existingPositions.has(i)) {
        slots.push(
          <div 
            key={`empty-${generateUniqueKey()}`}
            className="flex-none w-[210px] h-8 bg-gray-700/30 rounded"
          />
        );
      }
    }
    return slots;
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="flex items-center px-1.5 py-1.5">
        {event.munion && (
          <MEventUnionComponent
            eventId={event.id}
            union={event.munion}
            isActive={isActive}
            onToggle={() => setIsActive(!isActive)}
            onUnionUpdate={handleUnionUpdate}
          />
        )}
        <h2 className="text-base font-bold text-white ml-3">{event.title}</h2>
      </div>

      <div className="border-t border-gray-700">
        <div className="space-y-3 p-3">
          {Object.entries(itemsByRow).length === 0 ? (
            <div className="text-center text-gray-500 py-2">
              No items in this event
            </div>
          ) : (
            Object.entries(itemsByRow).map(([rowNum, items]) => {
              const rowNumber = parseInt(rowNum);
              const isRowActive = activeRows[rowNumber] || false;
              const rowKey = generateUniqueKey();

              return (
                <div key={`row-${rowKey}`} className="flex gap-2.5">
                  <button
                    onClick={() => toggleRow(rowNumber)}
                    className={`
                      flex-none w-[42px] h-8 rounded flex items-center justify-center transition-colors
                      ${isActive ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'}
                    `}
                  >
                    {isRowActive ? (
                      <Square className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </button>

                  <div className="flex gap-2.5 overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:w-1/4 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-500/50 [&::-webkit-scrollbar-track]:bg-gray-800/30">
                    {items.map((item) => (
                      <CasparClip
                        key={`clip-${generateUniqueKey()}`}
                        uniqueKey={generateUniqueKey()}
                        item={item}
                        isActive={isRowActive}
                      />
                    ))}
                    {renderEmptySlots(rowNumber, items)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}