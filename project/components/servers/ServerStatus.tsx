'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { updateServer } from '@/app/actions/server';

interface ServerStatusProps {
  server: any;
  loading: boolean;
}

export function ServerStatus({ server, loading }: ServerStatusProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const toggleConnection = async () => {
    if (!server.enabled || loading || isConnecting) return;

    try {
      setIsConnecting(true);
      await updateServer({
        ...server,
        connected: !server.connected
      });
    } catch (error) {
      console.error('Error toggling server connection:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div
        className={cn(
          "relative w-4 h-4 rounded-full",
          server.connected ? "bg-green-500" : "bg-red-500",
          server.enabled ? "cursor-pointer hover:opacity-80" : "opacity-50 cursor-not-allowed",
          (loading || isConnecting) && "animate-pulse"
        )}
        onClick={toggleConnection}
        title={`${server.name} (${server.host}:${server.port})
${server.connected ? 'Click to disconnect' : 'Click to connect'}`}
      >
        {(loading || isConnecting) && (
          <Loader2 className="absolute inset-0 w-full h-full animate-spin text-white" />
        )}
      </div>
      <span className="text-sm font-medium text-foreground">
        {server.name || 'No Server'}
      </span>
    </div>
  );
}
