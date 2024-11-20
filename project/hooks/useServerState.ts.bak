'use client';

import { create } from 'zustand';
import { DeviceConfig } from '@/lib/types/device';
import { CasparServer } from '@/server/device/caspar/CasparServer';

interface ServerState {
  servers: DeviceConfig[];
  isProjectSelectorOpen: boolean;
  isSettingsOpen: boolean;
  loading: boolean;
  error: string | null;
  setServers: (servers: DeviceConfig[]) => void;
  setIsProjectSelectorOpen: (isOpen: boolean) => void;
  setIsSettingsOpen: (isOpen: boolean) => void;
  getServerInstance: (id: number) => CasparServer | undefined;
  refreshServers: () => Promise<void>;
  updateServer: (server: DeviceConfig) => Promise<void>;
  deleteServer: (id: string) => Promise<void>;
  createServer: (server: DeviceConfig) => Promise<void>;
}

export const useServerState = create<ServerState>((set, get) => ({
  servers: [],
  isProjectSelectorOpen: false,
  isSettingsOpen: false,
  loading: false,
  error: null,
  setServers: (servers) => set({ servers }),
  setIsProjectSelectorOpen: (isOpen) => set({ isProjectSelectorOpen: isOpen }),
  setIsSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
  getServerInstance: (id) => CasparServer.getExistingInstance(id),
  
  refreshServers: async () => {
    try {
      set({ loading: true, error: null });
      const response = await fetch('/api/servers');
      if (!response.ok) throw new Error('Failed to fetch servers');
      const servers = await response.json();
      set({ servers, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
      console.error('Error refreshing servers:', error);
    }
  },

  updateServer: async (server) => {
    try {
      set({ loading: true, error: null });
      const response = await fetch('/api/servers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(server)
      });
      if (!response.ok) throw new Error('Failed to update server');
      await get().refreshServers();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
      console.error('Error updating server:', error);
    }
  },

  deleteServer: async (id) => {
    try {
      set({ loading: true, error: null });
      const response = await fetch(`/api/servers/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete server');
      await get().refreshServers();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
      console.error('Error deleting server:', error);
    }
  },

  createServer: async (server) => {
    try {
      set({ loading: true, error: null });
      const response = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(server)
      });
      if (!response.ok) throw new Error('Failed to create server');
      await get().refreshServers();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
      console.error('Error creating server:', error);
    }
  }
}));
