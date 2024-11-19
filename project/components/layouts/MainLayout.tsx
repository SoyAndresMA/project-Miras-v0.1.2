"use client";

import React, { useEffect, useState } from 'react';
import MainLayoutUI from './MainLayoutUI';
import ProjectSelectorModal from '../projects/ProjectSelectorModal';
import { useMainLayout } from '@/hooks/useMainLayout';
import { MenuSection } from '@/lib/types/layout';
import { Menu, Settings as SettingsIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Settings } from '../app/Settings';
import { getServerState } from '@/lib/actions/server';

interface MainLayoutProps {
  children: React.ReactNode;
  initialState: any; // Estado inicial desde el servidor
}

export function MainLayout({ children, initialState }: MainLayoutProps) {
  const [state, setState] = useState(initialState);
  const {
    state: {
      currentProject,
      isMenuOpen,
      dynamicInfo,
      isProjectSelectorOpen,
      isSettingsOpen,
      error,
      loading,
      isSaving,
      hasUnsavedChanges,
      appVersion,
      menuItems,
      servers
    },
    actions: {
      setIsMenuOpen,
      setIsProjectSelectorOpen,
      setIsSettingsOpen,
      saveProject,
      closeProject,
      setMenuItems,
      loadFullProject
    }
  } = useMainLayout(initialState);

  // Initialize menu items
  useEffect(() => {
    const defaultMenuItems: MenuSection[] = [
      {
        label: "File",
        submenu: [
          {
            label: "Open Project",
            action: () => setIsProjectSelectorOpen(true),
            icon: <Menu className="h-4 w-4" />
          },
          {
            label: "Close Project",
            action: closeProject,
            disabled: !currentProject,
            icon: <Menu className="h-4 w-4" />
          }
        ]
      },
      {
        label: "",
        submenu: [
          {
            label: "Settings",
            action: () => setIsSettingsOpen(true),
            icon: <SettingsIcon className="h-4 w-4" />
          }
        ]
      }
    ];
    setMenuItems(defaultMenuItems);
  }, [currentProject, setIsProjectSelectorOpen, closeProject, setMenuItems, setIsSettingsOpen]);

  // Solo actualizamos el estado cuando cambia algo en el servidor
  useEffect(() => {
    let mounted = true;
    
    const checkForUpdates = async () => {
      if (!mounted) return;
      
      try {
        const serverState = await getServerState();
        // Solo actualizamos si hay cambios
        if (JSON.stringify(serverState) !== JSON.stringify(state.servers)) {
          setState(prev => ({
            ...prev,
            servers: serverState
          }));
        }
      } catch (error) {
        console.error('Error checking server state:', error);
      }
    };

    const interval = setInterval(checkForUpdates, 2000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleProjectSelect = async (projectId: number) => {
    await loadFullProject(projectId);
    setIsProjectSelectorOpen(false);
  };

  return (
    <>
      <MainLayoutUI
        currentProject={currentProject}
        isMenuOpen={isMenuOpen}
        dynamicInfo={dynamicInfo}
        error={error}
        loading={loading}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        appVersion={appVersion}
        menuItems={menuItems}
        servers={servers}
        setIsMenuOpen={setIsMenuOpen}
        saveProject={saveProject}
      >
        {children}
      </MainLayoutUI>

      <ProjectSelectorModal
        isOpen={isProjectSelectorOpen}
        onClose={() => setIsProjectSelectorOpen(false)}
        onSelectProject={(project) => handleProjectSelect(project.id)}
      />

      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}