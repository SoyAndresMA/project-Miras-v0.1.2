'use client';

import { createContext, useContext, ReactNode, useState } from 'react';
import { DeviceConfig } from '@/lib/types/device';
import { Project } from '@/lib/types/project';

interface ServerState {
  servers: DeviceConfig[];
  currentProject: Project | null;
  appVersion: string;
}

interface ServerStateContextType extends ServerState {
  setServers: (servers: DeviceConfig[]) => void;
  setCurrentProject: (project: Project | null) => void;
}

const ServerStateContext = createContext<ServerStateContextType | null>(null);

interface ServerStateProviderProps {
  children: ReactNode;
  initialState: ServerState;
}

export function ServerStateProvider({ children, initialState }: ServerStateProviderProps) {
  const [state, setState] = useState<ServerState>(initialState);

  const setServers = (servers: DeviceConfig[]) => {
    setState(prev => ({ ...prev, servers }));
  };

  const setCurrentProject = (project: Project | null) => {
    setState(prev => ({ ...prev, currentProject: project }));
  };

  return (
    <ServerStateContext.Provider 
      value={{
        ...state,
        setServers,
        setCurrentProject,
      }}
    >
      {children}
    </ServerStateContext.Provider>
  );
}

export function useServerState() {
  const context = useContext(ServerStateContext);
  if (!context) {
    throw new Error('useServerState must be used within a ServerStateProvider');
  }
  return context;
}
