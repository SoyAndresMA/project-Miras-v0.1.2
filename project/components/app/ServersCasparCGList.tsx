import React, { useState, useEffect, useRef } from 'react';
import { DeviceConfig } from '@/lib/types/device';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Server, Wifi, WifiOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useServerState } from '@/hooks/useServerState';

interface ServersCasparCGListProps {
  servers: DeviceConfig[];
  selectedServer: DeviceConfig | null;
  isLoading: boolean;
  onSelectServer: (server: DeviceConfig) => void;
  onNewServer: () => void;
  onConnectServer: (server: DeviceConfig) => Promise<void>;
}

export const ServersCasparCGList: React.FC<ServersCasparCGListProps> = ({
  servers,
  selectedServer,
  isLoading,
  onSelectServer,
  onNewServer,
  onConnectServer,
}) => {
  const { toast } = useToast();

  // Crear estados para cada servidor
  const serverStates = Object.fromEntries(
    servers.map(server => [
      server.id,
      useServerState(server.id)
    ])
  );

  const handleServerDoubleClick = async (server: DeviceConfig) => {
    if (!serverStates[server.id]?.state?.connected) {
      try {
        await onConnectServer(server);
      } catch (error) {
        console.error('Error connecting to server:', error);
        toast({
          title: "Error",
          description: "No se pudo conectar al servidor",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="grid gap-4 p-4">
      {/* Header with New Server button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Servidores CasparCG</h2>
        <Button
          onClick={onNewServer}
          variant="outline"
          className="border-gray-700 hover:bg-gray-800 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Servidor
        </Button>
      </div>

      {/* Server List */}
      <div className="grid gap-4">
        {servers.map((server) => {
          const { state, error } = serverStates[server.id] || {};
          const isConnected = state?.connected ?? false;
          const isSelected = selectedServer?.id === server.id;
          
          return (
            <Card
              key={server.id}
              className={cn(
                "bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors cursor-pointer",
                isSelected && "border-blue-500",
                !server.enabled && "opacity-50"
              )}
              onClick={() => onSelectServer(server)}
              onDoubleClick={() => handleServerDoubleClick(server)}
            >
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Server className="h-8 w-8 text-gray-400" />
                  <div>
                    <h3 className="font-medium text-white">{server.name}</h3>
                    <p className="text-sm text-gray-400">
                      {server.host}:{server.port}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {error ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="destructive" className="h-6">
                            Error
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{error}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : isConnected ? (
                    <Badge variant="success" className="h-6">
                      <Wifi className="h-4 w-4 mr-1" />
                      Conectado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="h-6">
                      <WifiOff className="h-4 w-4 mr-1" />
                      Desconectado
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
