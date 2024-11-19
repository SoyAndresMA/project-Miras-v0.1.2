"use client";

import React, { useRef, useEffect } from 'react';
import { Menu, Heart, Share, Save, AlertCircle, Loader2, Wifi, WifiOff } from 'lucide-react';
import { Project } from '@/lib/types/project';
import { MenuSection } from '@/lib/types/layout';
import { DeviceConfig } from '@/lib/types/device';
import { cn } from '@/lib/utils';
import { useServerState } from '@/hooks/useServerState';

interface TopBannerProps {
  currentProject: Project | null;
  isMenuOpen: boolean;
  dynamicInfo: string;
  error: string | null;
  loading: boolean;
  isSaving: boolean;
  appVersion: string;
  menuItems: MenuSection[];
  servers: DeviceConfig[];
  setIsMenuOpen: (isOpen: boolean) => void;
  saveProject: () => void;
}

export function TopBanner({
  currentProject,
  isMenuOpen,
  dynamicInfo,
  error,
  loading,
  isSaving,
  appVersion,
  menuItems,
  servers,
  setIsMenuOpen,
  saveProject
}: TopBannerProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const serverStates = servers.map(server => useServerState(server.id));
  const anyServerConnected = serverStates.some(state => state.state?.connected);
  const anyServerError = serverStates.some(state => state.error);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsMenuOpen]);

  return (
    <div className="h-8 bg-gray-800 shadow-md flex items-center px-1 border-b border-gray-700">
      <div className="flex items-center space-x-2 flex-1">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={cn(
              "p-1 rounded hover:bg-gray-700 transition-colors",
              isMenuOpen && "bg-gray-700"
            )}
          >
            <Menu className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Project Info */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">
            {currentProject ? currentProject.name : 'No project loaded'}
          </span>
        </div>
      </div>

      {/* CasparCG Servers Status */}
      <div className="flex-1 flex items-center justify-center space-x-2">
        {servers.map((server, index) => {
          const { state, error } = serverStates[index];
          const isConnected = state?.connected ?? false;
          
          return (
            <div 
              key={`server-${server.id}`} 
              className="flex items-center space-x-1"
              title={error || `Server: ${server.name}`}
            >
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-gray-500" />
              )}
              <span className="text-sm text-gray-400">{server.name}</span>
            </div>
          );
        })}
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          ) : error ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : anyServerConnected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-gray-500" />
          )}
          
          <span className="text-sm text-gray-400">
            {error || dynamicInfo || (anyServerConnected ? "Conectado" : "Desconectado")}
          </span>
        </div>

        <div key="actions" className="flex items-center space-x-1">
          {isSaving && (
            <Save key="save-icon" className="h-4 w-4 text-blue-400 animate-pulse" />
          )}
          <Heart key="heart-icon" className="h-4 w-4 text-gray-400 hover:text-gray-300 transition-colors" />
          <Share key="share-icon" className="h-4 w-4 text-gray-400 hover:text-gray-300 transition-colors" />
        </div>

        <span className="text-xs text-gray-500">{appVersion}</span>
      </div>
    </div>
  );
}