"use client";

import React, { useEffect } from 'react';
import MainLayoutUI from './MainLayoutUI';
import ProjectSelectorModal from '../projects/ProjectSelectorModal';
import { useMainLayout } from '@/hooks/useMainLayout';
import { MenuSection } from '@/lib/types/layout';
import { Menu, Settings as SettingsIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Settings } from '../app/Settings';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
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
  } = useMainLayout();

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