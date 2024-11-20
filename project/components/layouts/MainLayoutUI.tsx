"use client";

import React from 'react';
import { Project } from '@/lib/types/project';
import { TopBanner } from './TopBanner';
import { MEventsContainer } from './MEventsContainer';
import { RightPanel } from './RightPanel';

interface MainLayoutUIProps {
  currentProject: Project | null;
  isMenuOpen: boolean;
  dynamicInfo: any;
  error: string | null;
  onMenuToggle: () => void;
  children: React.ReactNode;
}

export default function MainLayoutUI({
  currentProject,
  isMenuOpen,
  dynamicInfo,
  error,
  onMenuToggle,
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
          onMenuToggle={onMenuToggle}
        />
        <MEventsContainer>
          {children}
        </MEventsContainer>
      </div>
      <RightPanel />
    </div>
  );
}