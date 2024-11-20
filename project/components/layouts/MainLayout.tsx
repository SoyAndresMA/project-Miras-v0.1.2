'use client';

import React, { useState, useEffect } from 'react';
import MainLayoutUI from './MainLayoutUI';
import { useAppState } from '@/hooks/useAppState';
import { useServerState } from '@/hooks/useServerState';
import { Project } from '@/lib/types/project';
import { saveProject } from '@/app/actions/server';
import ProjectSelectorModal from '@/components/projects/ProjectSelectorModal';
import SettingsModal from '@/components/settings/SettingsModal';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    currentProject,
    loading,
    hasUnsavedChanges,
    dynamicInfo,
    menuItems,
    appVersion,
    isProjectSelectorOpen,
    setIsProjectSelectorOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    servers
  } = useAppState();

  const { refreshServers } = useServerState();

  useEffect(() => {
    // Cargar servidores inicialmente
    refreshServers();

    // Refrescar cada 30 segundos
    const interval = setInterval(refreshServers, 30000);
    return () => clearInterval(interval);
  }, [refreshServers]);

  const handleSaveProject = async () => {
    if (!currentProject) return;
    
    try {
      setIsSaving(true);
      await saveProject(currentProject);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project');
    } finally {
      setIsSaving(false);
    }
  };

  // Transform menu items to add className to icons
  const processedMenuItems = menuItems.map(section => ({
    ...section,
    submenu: section.submenu?.map(item => ({
      ...item,
      icon: item.icon ? React.createElement(item.icon, { className: 'h-4 w-4' }) : null
    })) || []
  }));

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
        menuItems={processedMenuItems}
        servers={servers}
        setIsMenuOpen={setIsMenuOpen}
        saveProject={handleSaveProject}
      >
        {children}
      </MainLayoutUI>

      <ProjectSelectorModal 
        isOpen={isProjectSelectorOpen}
        onClose={() => setIsProjectSelectorOpen(false)}
        onSelectProject={async (project) => {
          try {
            await saveProject(project);
            setIsProjectSelectorOpen(false);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save project');
          }
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}