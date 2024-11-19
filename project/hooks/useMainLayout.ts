"use client";

import { useState, useCallback, useEffect } from 'react';
import { MainLayoutState, MenuSection } from '@/lib/types/layout';
import { Project } from '@/lib/types/project';
import { DeviceConfig } from '@/lib/types/device';
import EventBus from '@/lib/events/EventBus';
import CasparServer from '@/server/device/caspar/CasparServer';

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
  const [serversInitialized, setServersInitialized] = useState(false);

  // Inicialización de servidores
  useEffect(() => {
    const initializeServers = async () => {
      if (!state.servers.length) return;
      
      try {
        // Esperar a que todos los servidores estén inicializados
        await Promise.all(state.servers.map(async server => {
          if (!server?.id) return;
          const instance = await CasparServer.getInstance({
            id: server.id,
            name: server.name,
            host: server.host,
            port: server.port,
            enabled: server.enabled
          });
          return instance;
        }));
        
        setServersInitialized(true);
      } catch (error) {
        console.error('Error initializing servers:', error);
        setServersInitialized(false);
      }
    };

    initializeServers();
  }, [state.servers]);

  useEffect(() => {
    if (!serversInitialized) return;

    const handleServerStatus = (event: ServerStatusEvent) => {
      setState(prev => ({
        ...prev,
        servers: prev.servers.map(server => ({
          ...server,
          ...event.status,
          name: event.status.name || server.name,
          connected: event.status.connected || false
        }))
      }));
      setDynamicInfo(event.status.connected ? 
        `Servidor ${event.status.name || event.serverId} conectado (v${event.status.version})` : 
        'Servidor desconectado');
    };

    const unsubscribe = EventBus.getInstance().subscribe('SERVER_STATUS', handleServerStatus);

    return () => {
      unsubscribe();
    };
  }, [serversInitialized]);

  const setIsMenuOpen = useCallback((isOpen: boolean) => {
    setState(prev => ({ ...prev, isMenuOpen: isOpen }));
  }, []);

  const setIsProjectSelectorOpen = useCallback((isOpen: boolean) => {
    setState(prev => ({ ...prev, isProjectSelectorOpen: isOpen }));
  }, []);

  const setIsSettingsOpen = useCallback((isOpen: boolean) => {
    setState(prev => ({ ...prev, isSettingsOpen: isOpen }));
  }, []);

  const loadFullProject = useCallback(async (projectId: number): Promise<Project | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error('Failed to load project');
      const project = await response.json();
      
      setState(prev => ({ 
        ...prev, 
        currentProject: project,
        loading: false,
        hasUnsavedChanges: false
      }));

      const event = new CustomEvent('projectLoaded', { detail: project });
      window.dispatchEvent(event);

      return project;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: 'Error loading project',
        loading: false 
      }));
      return null;
    }
  }, []);

  const saveProject = useCallback(async () => {
    if (!state.currentProject || state.isSaving) return;

    setState(prev => ({ ...prev, isSaving: true }));
    try {
      const response = await fetch(`/api/projects/${state.currentProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.currentProject)
      });

      if (!response.ok) throw new Error('Failed to save project');

      setState(prev => ({
        ...prev,
        isSaving: false,
        hasUnsavedChanges: false,
        lastSavedAt: new Date(),
        dynamicInfo: 'Project saved successfully'
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: 'Error saving project'
      }));
    }
  }, [state.currentProject, state.isSaving]);

  const closeProject = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentProject: null,
      hasUnsavedChanges: false,
      lastSavedAt: null
    }));

    const event = new CustomEvent('projectLoaded', { detail: null });
    window.dispatchEvent(event);
  }, []);

  const setMenuItems = useCallback((items: MenuSection[]) => {
    setState(prev => ({ ...prev, menuItems: items }));
  }, []);

  const setDynamicInfo = useCallback((info: string) => {
    setState(prev => ({ ...prev, dynamicInfo: info }));
  }, []);

  return {
    state,
    actions: {
      setIsMenuOpen,
      setIsProjectSelectorOpen,
      setIsSettingsOpen,
      loadFullProject,
      saveProject,
      closeProject,
      setMenuItems,
      setDynamicInfo
    }
  };
}