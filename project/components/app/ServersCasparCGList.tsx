import React from 'react';
import { DeviceConfig } from '@/types/device';
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

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
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">CasparCG Servers</h2>
        <Button onClick={onNewServer} disabled={isLoading}>
          <Plus className="mr-2 h-4 w-4" />
          New Server
        </Button>
      </div>

      <div className="grid gap-4">
        {servers.map((server) => (
          <div
            key={server.id}
            className={`p-4 rounded-lg border cursor-pointer ${
              selectedServer?.id === server.id
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => onSelectServer(server)}
            onDoubleClick={() => handleServerDoubleClick(server)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-4 h-4 rounded-full ${
                    server.connected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                >
                  {server.loading && (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  )}
                </div>
                <span className="font-medium">{server.name}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {server.host}:{server.port}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
