"use client";

import { useState, useCallback, useEffect } from 'react';
import { MainLayoutState } from '@/lib/types/layout';
import { Project } from '@/lib/types/project';
import { MenuSection } from '@/lib/types/layout';
import { DeviceConfig } from '@/lib/types/device';

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

  // Efecto para comprobar el estado periódicamente
  useEffect(() => {
    let mounted = true;
    let intervalId: NodeJS.Timeout;
    
    const checkServerStatus = async () => {
      if (!mounted) return;
      
      try {
        const response = await fetch('/api/casparcg/status');
        if (!response.ok) throw new Error('Failed to fetch server status');
        
        const status = await response.json();
        
        setState(prev => ({
          ...prev,
          servers: prev.servers.map(server => ({
            ...server,
            ...status[server.id],
            name: status[server.id]?.name || server.name,
            connected: status[server.id]?.connected || false
          }))
        }));
      } catch (error) {
        console.debug('Server status check failed:', error);
        // No actualizamos el estado aquí para permitir operación sin servidor
      }
    };

    // Solo iniciamos el polling si hay servidores configurados
    if (state.servers.length > 0) {
      // Hacemos una verificación inicial
      checkServerStatus();
      
      // Configuramos el polling cada 5 segundos
      intervalId = setInterval(checkServerStatus, 5000);
    }

    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [state.servers.length]); // Solo se reinicia si cambia el número de servidores

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

      // Dispatch event for project loaded
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

    // Dispatch event for project closed
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