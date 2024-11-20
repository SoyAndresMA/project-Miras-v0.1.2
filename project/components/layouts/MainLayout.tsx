'use client';

import React, { useState, useTransition } from 'react';
import { Toaster } from 'react-hot-toast';
import { useOptimistic } from 'react';
import MainLayoutUI from './MainLayoutUI';
import { useServerState } from '@/components/providers/ServerStateProvider';
import { Project } from '@/lib/types/project';
import { saveProject } from '@/app/actions/server-actions';
import ProjectSelectorModal from '@/components/projects/ProjectSelectorModal';
import SettingsModal from '@/components/settings/SettingsModal';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { servers, currentProject, setCurrentProject } = useServerState();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [optimisticProject, setOptimisticProject] = useOptimistic(
    currentProject,
    (state, newProject: Project | null) => newProject
  );

  const handleProjectSelect = async (project: Project) => {
    setError(null);
    startTransition(async () => {
      try {
        await saveProject(project);
        setCurrentProject(project);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save project');
      }
    });
  };

  const dynamicInfo = React.useMemo(() => ({
    items: servers?.map(item => ({
      id: item.id,
      title: item.name,
      icon: item.icon ? React.createElement(item.icon, { className: 'h-4 w-4' }) : null
    })) || []
  }), [servers]);

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />
      <MainLayoutUI
        currentProject={optimisticProject}
        dynamicInfo={dynamicInfo}
        error={error}
      >
        {children}
      </MainLayoutUI>

      <ProjectSelectorModal
        isOpen={!currentProject}
        onClose={() => {}}
        onSelect={handleProjectSelect}
      />

      <SettingsModal
        isOpen={false}
        onClose={() => {}}
      />
    </div>
  );
}