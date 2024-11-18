"use client";

import React, { useRef, useEffect } from 'react';
import { Menu, Heart, Share, Save, AlertCircle, Loader2 } from 'lucide-react';
import { Project } from '@/lib/types/project';
import { MenuSection } from '@/lib/types/layout';
import { DeviceConfig } from '@/lib/types/device';
import { cn } from '@/lib/utils';

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
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            disabled={loading}
          >
            <Menu className="h-4 w-4" />
          </button>
          
          {isMenuOpen && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-gray-700 rounded shadow-xl border border-gray-600 z-50">
              {menuItems.map((section, index) => (
                <div key={index} className="relative group">
                  {section.label && (
                    <div className="px-3 py-1.5 font-medium text-gray-100">
                      {section.label}
                    </div>
                  )}
                  <div className="w-full">
                    {section.submenu.map((item, subIndex) => (
                      <button
                        key={subIndex}
                        className={cn(
                          "w-full text-left px-4 py-1.5 flex items-center gap-2",
                          item.disabled 
                            ? 'text-gray-500 cursor-not-allowed' 
                            : 'text-gray-200 hover:bg-gray-600',
                          "transition-colors"
                        )}
                        onClick={() => {
                          if (!item.disabled && item.action) {
                            item.action();
                            setIsMenuOpen(false);
                          }
                        }}
                        disabled={item.disabled}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          <span className="font-semibold">Miras</span>
          <span className="text-gray-400 text-sm">{appVersion}</span>
          <span className="text-gray-400 mx-1">-</span>
          <span className="text-gray-300">
            {loading ? 'Loading...' : (currentProject?.name || "No project")}
          </span>
        </div>
      </div>

      {/* CasparCG Servers Status */}
      <div className="flex-1 flex items-center justify-center space-x-2">
        {servers.map((server) => (
          <div key={server.id} className="flex items-center space-x-2">
            <div 
              className={`relative w-4 h-4 rounded-full ${
                server.connected ? 'bg-green-500' : 'bg-red-500'
              } cursor-pointer`}
              onDoubleClick={async () => {
                if (!server.connected && server) {
                  try {
                    const response = await fetch(`/api/casparcg/servers/${server.id}/connect`, {
                      method: 'POST',
                    });
                    if (response.ok) {
                      // setIsConnected(true); // This line is commented out because setIsConnected is not defined in this scope
                    }
                  } catch (error) {
                    console.error('Error connecting to server:', error);
                  }
                }
              }}
            >
              {server.loading && (
                <Loader2 className="absolute inset-0 w-full h-full animate-spin text-white" />
              )}
            </div>
            <span className="text-sm font-medium">{server?.name || 'No Server'}</span>
          </div>
        ))}
      </div>
      
      <div className="flex items-center space-x-2">
        <span className={cn(
          "text-gray-400 text-sm",
          error && "text-red-400",
          "flex items-center gap-1"
        )}>
          {error && <AlertCircle className="h-4 w-4" />}
          {error || dynamicInfo}
        </span>
        <div className="flex items-center space-x-1">
          {isSaving && (
            <Save className="h-4 w-4 text-blue-400 animate-pulse" />
          )}
          <Heart className="h-4 w-4 text-gray-400 hover:text-gray-300 transition-colors" />
          <Share className="h-4 w-4 text-gray-400 hover:text-gray-300 transition-colors" />
        </div>
      </div>
    </div>
  );
}