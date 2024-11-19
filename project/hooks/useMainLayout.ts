"use client";

import { useState, useCallback } from 'react';
import { MainLayoutState } from '@/lib/types/layout';

const defaultInitialState: MainLayoutState = {
  currentProject: null,
  isMenuOpen: false,
  dynamicInfo: '',
  isProjectSelectorOpen: false,
  isSettingsOpen: false,
  error: null,
  loading: false,
  isSaving: false,
  hasUnsavedChanges: false,
  lastSavedAt: null,
  appVersion: 'v0.1.2',
  menuItems: [],
  availableUnions: [],
  servers: []
};

export function useMainLayout(initialState: MainLayoutState = defaultInitialState) {
  const [state, setState] = useState<MainLayoutState>(initialState);

  const setDynamicInfo = useCallback((info: string) => {
    setState(prev => ({ ...prev, dynamicInfo: info }));
  }, []);

  // Simplificar la conexión al servidor para solo manejar UI
  const connectToServer = useCallback(async (serverId: number) => {
    try {
      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        servers: prev.servers.map(server => 
          server.id === serverId 
            ? { ...server, loading: true }
            : server
        )
      }));

      const response = await fetch(`/api/casparcg/servers/${serverId}/connect`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to connect to server');
      }

      setState(prev => ({
        ...prev,
        loading: false,
        servers: prev.servers.map(server => 
          server.id === serverId 
            ? { ...server, loading: false, connected: true }
            : server
        )
      }));

      setDynamicInfo(`Connected to server ${serverId}`);
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to connect to server',
        servers: prev.servers.map(server => 
          server.id === serverId 
            ? { ...server, loading: false, connected: false }
            : server
        )
      }));
      setDynamicInfo(`Failed to connect to server ${serverId}`);
    }
  }, [setDynamicInfo]);

  const disconnectFromServer = useCallback(async (serverId: number) => {
    try {
      const response = await fetch(`/api/casparcg/servers/${serverId}/disconnect`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect from server');
      }

      setState(prev => ({
        ...prev,
        servers: prev.servers.map(server => 
          server.id === serverId 
            ? { ...server, connected: false }
            : server
        )
      }));
      setDynamicInfo(`Disconnected from server ${serverId}`);
    } catch (error) {
      setDynamicInfo(`Failed to disconnect from server ${serverId}`);
    }
  }, [setDynamicInfo]);

  return {
    state,
    actions: {
      setIsMenuOpen: useCallback((isOpen: boolean) => {
        setState(prev => ({ ...prev, isMenuOpen: isOpen }));
      }, []),
      setIsProjectSelectorOpen: useCallback((isOpen: boolean) => {
        setState(prev => ({ ...prev, isProjectSelectorOpen: isOpen }));
      }, []),
      setIsSettingsOpen: useCallback((isOpen: boolean) => {
        setState(prev => ({ ...prev, isSettingsOpen: isOpen }));
      }, []),
      setMenuItems: useCallback((items: any[]) => {
        setState(prev => ({ ...prev, menuItems: items }));
      }, []),
      loadFullProject: useCallback((project: any) => {
        setState(prev => ({ 
          ...prev, 
          currentProject: project,
          isProjectSelectorOpen: false
        }));
      }, []),
      saveProject: useCallback(() => {
        setState(prev => ({ 
          ...prev, 
          isSaving: true,
          hasUnsavedChanges: false,
          lastSavedAt: new Date()
        }));
      }, []),
      closeProject: useCallback(() => {
        setState(prev => ({ 
          ...prev, 
          currentProject: null
        }));
      }, []),
      connectToServer,
      disconnectFromServer,
      setDynamicInfo
    }
  };
}