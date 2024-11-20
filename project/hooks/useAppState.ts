'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/lib/types/project';
import { MenuSection } from '@/lib/types/layout';
import { getServers } from '@/app/actions/server';
import { Menu, Settings as SettingsIcon } from 'lucide-react';
import { useServerState } from './useServerState';

export function useAppState() {
  const [loading, setLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [dynamicInfo, setDynamicInfo] = useState('');
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [appVersion, setAppVersion] = useState('1.0.0');

  const serverState = useServerState();

  const menuItems: MenuSection[] = [
    {
      label: "File",
      submenu: [
        {
          label: "Open Project",
          action: () => serverState.setIsProjectSelectorOpen(true),
          icon: Menu
        }
      ]
    },
    {
      label: "",
      submenu: [
        {
          label: "Settings",
          action: () => serverState.setIsSettingsOpen(true),
          icon: SettingsIcon
        }
      ]
    }
  ];

  useEffect(() => {
    let mounted = true;
    
    const pollServers = async () => {
      if (!mounted) return;
      
      try {
        setLoading(true);
        const updatedServers = await getServers();
        serverState.setServers(updatedServers);
      } catch (error) {
        console.error('Error polling servers:', error);
      } finally {
        setLoading(false);
      }
    };

    // Llamada inicial
    pollServers();

    // Polling cada 10 segundos en lugar de 5
    const interval = setInterval(pollServers, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [serverState]);

  return {
    loading,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    currentProject,
    setCurrentProject,
    dynamicInfo,
    setDynamicInfo,
    menuItems,
    appVersion,
    isProjectSelectorOpen: serverState.isProjectSelectorOpen,
    setIsProjectSelectorOpen: serverState.setIsProjectSelectorOpen,
    isSettingsOpen: serverState.isSettingsOpen,
    setIsSettingsOpen: serverState.setIsSettingsOpen,
    servers: serverState.servers,
    startPolling: serverState.startPolling,
    stopPolling: serverState.stopPolling
  };
}
