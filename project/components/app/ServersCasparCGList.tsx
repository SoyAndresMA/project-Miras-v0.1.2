import React from 'react';
import { DeviceConfig } from '@/types/device';
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

  const handleServerDoubleClick = async (server: DeviceConfig) => {
    if (!server.connected) {
      try {
        await onConnectServer(server);
        toast({
          title: "Success",
          description: `Connected to server ${server.name}`,
        });
      } catch (error) {
        console.error('Error connecting to server:', error);
        toast({
          title: "Error",
          description: "Failed to connect to server",
          variant: "destructive"
        });
      }
    }
  };

  const getStatusColor = (server: DeviceConfig) => {
    if (server.loading) return 'bg-yellow-500';
    if (server.connected) return 'bg-green-500';
    return 'bg-red-500';
  };

  const getStatusText = (server: DeviceConfig) => {
    if (server.loading) return 'Connecting...';
    if (server.connected) return 'Connected';
    return 'Disconnected';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6 px-2">
        <div className="flex items-center gap-4">
          <Server className="h-5 w-5" />
          <h2 className="text-xl font-semibold">CasparCG Servers</h2>
        </div>
        <Button onClick={onNewServer} disabled={isLoading}>
          <Plus className="mr-2 h-4 w-4" />
          New Server
        </Button>
      </div>

      <div className="grid gap-3">
        {servers.map((server) => (
          <Card
            key={server.id}
            className={`
              p-4 cursor-pointer transition-all duration-200
              ${selectedServer?.id === server.id
                ? 'ring-2 ring-primary'
                : 'hover:bg-accent'
              }
            `}
            onClick={() => onSelectServer(server)}
            onDoubleClick={() => handleServerDoubleClick(server)}
          >
            <div className="flex flex-col space-y-3">
              {/* Cabecera con nombre y estado */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div
                      className={`w-3 h-3 rounded-full ${getStatusColor(server)}`}
                    />
                    {server.loading && (
                      <div className="absolute inset-0 animate-ping rounded-full bg-yellow-500 opacity-75" />
                    )}
                  </div>
                  <span className="font-medium">{server.name}</span>
                </div>

                <div className="flex items-center space-x-2">
                  {server.is_shadow && (
                    <Badge variant="secondary" className="text-xs">Shadow</Badge>
                  )}
                  {!server.enabled && (
                    <Badge variant="outline" className="text-xs">Disabled</Badge>
                  )}
                </div>
              </div>

              {/* Información y estado */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-sm text-muted-foreground">
                  {server.host}:{server.port}
                </div>

                <div className="flex justify-end items-center space-x-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          {server.connected ? (
                            <Wifi className="h-4 w-4 text-green-500" />
                          ) : (
                            <WifiOff className="h-4 w-4 text-red-500" />
                          )}
                          <span>{getStatusText(server)}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Double-click to {server.connected ? 'disconnect' : 'connect'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {server.version && (
                    <Badge variant="outline" className="text-xs">
                      v{server.version}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Descripción si existe */}
              {server.description && (
                <p className="text-sm text-muted-foreground border-t pt-2">
                  {server.description}
                </p>
              )}
            </div>
          </Card>
        ))}

        {servers.length === 0 && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            No servers configured. Click "New Server" to add one.
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
};
