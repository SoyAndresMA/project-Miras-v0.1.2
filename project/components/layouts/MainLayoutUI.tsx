"use client";

import React from 'react';
import { Project } from '@/lib/types/project';
import { MenuSection } from '@/lib/types/layout';
import { TopBanner } from './TopBanner';
import { MEventsContainer } from './MEventsContainer';
import { RightPanel } from './RightPanel';
import { DeviceConfig } from '@/lib/types/device';

interface MainLayoutUIProps {
  currentProject: Project | null;
  isMenuOpen: boolean;
  dynamicInfo: string;
  error: string | null;
  loading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  appVersion: string;
  menuItems: MenuSection[];
  servers: DeviceConfig[];
  setIsMenuOpen: (isOpen: boolean) => void;
  saveProject: () => void;
  children: React.ReactNode;
}

export default function MainLayoutUI({
  currentProject,
  isMenuOpen,
  dynamicInfo,
  error,
  loading,
  isSaving,
  hasUnsavedChanges,
  appVersion,
  menuItems,
  servers,
  setIsMenuOpen,
  saveProject,
  children
}: MainLayoutUIProps) {
  return (
    <div className="flex h-screen w-full bg-gray-900 text-gray-100">
      <div className="flex flex-col min-w-0 flex-1">
        <TopBanner
          currentProject={currentProject}
          isMenuOpen={isMenuOpen}
          dynamicInfo={dynamicInfo}
          error={error}
          loading={loading}
          isSaving={isSaving}
          appVersion={appVersion}
          menuItems={menuItems}
          servers={servers}
          setIsMenuOpen={setIsMenuOpen}
          saveProject={saveProject}
        />
        <MEventsContainer>
          {children}
        </MEventsContainer>
      </div>
      <RightPanel />
    </div>
  );
}