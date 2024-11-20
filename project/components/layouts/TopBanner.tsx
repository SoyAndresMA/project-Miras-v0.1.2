'use client';

import React from 'react';
import { Menu } from 'lucide-react';
import { Project } from '@/lib/types/project';
import { cn } from '@/lib/utils';

interface TopBannerProps {
  currentProject: Project | null;
  isMenuOpen: boolean;
  dynamicInfo: any;
  error: string | null;
  onMenuToggle: () => void;
}

export function TopBanner({
  currentProject,
  isMenuOpen,
  dynamicInfo,
  error,
  onMenuToggle
}: TopBannerProps) {
  return (
    <div className="h-8 bg-gray-800 shadow-md flex items-center px-1 border-b border-gray-700">
      <div className="flex items-center space-x-2 flex-1">
        <button 
          className="p-1 hover:bg-gray-700 rounded transition-colors"
          onClick={onMenuToggle}
        >
          <Menu className="h-4 w-4" />
        </button>
        
        <div className="flex items-center space-x-1">
          <span key="brand" className="font-semibold">Miras</span>
          <span key="project" className="text-gray-300">
            {currentProject?.name || "No project"}
          </span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center space-x-2">
        {dynamicInfo?.items?.map((item: any) => (
          <div key={item.id} className="flex items-center space-x-2">
            <span className="text-sm font-medium">{item.title}</span>
          </div>
        ))}
      </div>
      
      <div className="flex items-center space-x-2">
        <span className={cn(
          "text-gray-400 text-sm",
          error && "text-red-400"
        )}>
          {error || dynamicInfo}
        </span>
      </div>
    </div>
  );
}