import { useState, useEffect } from 'react';
import { ServerManager } from '@/lib/services/ServerManager';
import EventBus from '@/lib/events/EventBus';

interface ServerState {
  connected: boolean;
  loading: boolean;
  error: string | null;
}

export function useServerState(serverId: string) {
  const [state, setState] = useState<ServerState>({
    connected: false,
    loading: false,
    error: null
  });

  useEffect(() => {
    const serverManager = ServerManager.getInstance();
    
    // Get initial state
    const initialState = serverManager.getServerState(serverId);
    setState(initialState);

    // Subscribe to server state changes
    const unsubscribe = serverManager.subscribeToServerState(serverId, setState);

    // Subscribe to EventBus events
    const handleServerStatus = (event: any) => {
      if (event.serverId.toString() === serverId) {
        setState(prev => ({
          ...prev,
          connected: event.connected,
          error: event.error || null,
          loading: false
        }));
      }
    };

    EventBus.on('SERVER_STATUS', handleServerStatus);

    return () => {
      unsubscribe();
      EventBus.off('SERVER_STATUS', handleServerStatus);
    };
  }, [serverId]);

  const connectServer = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const serverManager = ServerManager.getInstance();
      await serverManager.connectServer(serverId);
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false 
      }));
    }
  };

  const disconnectServer = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const serverManager = ServerManager.getInstance();
      await serverManager.disconnectServer(serverId);
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false 
      }));
    }
  };

  return {
    state,
    connectServer,
    disconnectServer
  };
}
