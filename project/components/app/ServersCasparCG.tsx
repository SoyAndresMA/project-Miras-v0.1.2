'use client';

import React, { useState, useEffect } from 'react';
import { DeviceConfig } from '@/lib/types/device';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { useServerState } from '@/components/providers/ServerStateProvider';
import { useOptimistic } from 'react';
import { 
  getServers,
  updateServer,
  testServerConnection,
  createServer,
  deleteServer
} from '@/app/actions/server-actions';

export function ServersCasparCG() {
  const serverState = useServerState();
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>("");
  const { toast } = useToast();

  const [optimisticServers, updateOptimisticServers] = useOptimistic(
    serverState.servers,
    (state: DeviceConfig[], updatedServer: DeviceConfig) => 
      state.map(s => s.id === updatedServer.id ? updatedServer : s)
  );

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    try {
      setIsLoading(true);
      const loadedServers = await getServers();
      serverState.setServers(loadedServers);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load servers",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Función para probar la conexión con un servidor
  const testServerConnection = async (server: DeviceConfig) => {
    setConnectionStatus("Initiating connection test...");
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      setConnectionStatus("Connecting to server...");
      const response = await fetch(`/api/casparcg/servers/${server.id}/connect`, {
        method: 'POST',
        signal: controller.signal
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Connection test failed');
      }
      
      // Update server version and channels if available
      if (data.version) {
        handleUpdateServer('version', data.version);
      }
      if (data.channels) {
        handleUpdateServer('channel_formats', data.channels.join(','));
      }
      
      setConnectionStatus("Connection test successful");
      return data;
    } catch (error) {
      setConnectionStatus(error instanceof Error ? error.message : 'Connection test failed');
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  // Log connection events
  const logConnectionEvent = async (serverId: number, success: boolean, message: string) => {
    try {
      await fetch(`/api/casparcg/servers/${serverId}/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success,
          message,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to log connection event:', error);
    }
  };

  // Función para intentar conectar a un servidor
  const handleConnectServer = async (server: DeviceConfig) => {
    console.log(`🚀 Intentando conectar al servidor ${server.name}...`);
    let retryCount = 0;
    const maxRetries = 3;

    const attemptConnection = async (): Promise<boolean> => {
      try {
        setIsTesting(true);
        const updatedServer = await testServerConnection(server);
        
        serverState.updateServer(updatedServer);

        if (serverState.selectedServer?.id === updatedServer.id) {
          serverState.setSelectedServer(updatedServer);
        }

        console.log(`✨ Conexión exitosa con ${server.name}`);
        return updatedServer.connected;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error al conectar con servidor (intento ${retryCount + 1}/${maxRetries}):`, errorMessage);
        
        if (retryCount < maxRetries - 1) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
          return attemptConnection();
        }
        
        toast({
          title: "Connection Failed",
          description: `Failed to connect to ${server.name}: ${errorMessage}`,
          variant: "destructive"
        });
        
        return false;
      } finally {
        setIsTesting(false);
      }
    };

    return attemptConnection();
  };

  // Manejar doble clic en un servidor
  const handleServerDoubleClick = async (server: DeviceConfig) => {
    if (!server.connected) {
      await handleConnectServer(server);
    }
  };

  const handleUpdateServer = async (field: string, value: any) => {
    if (serverState.selectedServer) {
      const updatedServer = { ...serverState.selectedServer, [field]: value };
      startTransition(async () => {
        try {
          updateOptimisticServers(updatedServer);
          await updateServer(updatedServer);
          await loadServers(); // Recargar para asegurar sincronización
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to update server",
            variant: "destructive"
          });
        }
      });
    }
  };

  const handleSave = async () => {
    if (!serverState.selectedServer) return;

    try {
      setIsLoading(true);
      
      const endpoint = serverState.selectedServer.id === 0 
        ? '/api/casparcg/servers' 
        : `/api/casparcg/servers/${serverState.selectedServer.id}`;
        
      const response = await fetch(endpoint, {
        method: serverState.selectedServer.id === 0 ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serverState.selectedServer),
      });

      if (!response.ok) throw new Error('Failed to save server');

      const result = await response.json();

      // Actualizar el estado del servidor seleccionado con la respuesta del servidor
      if (result.enabled !== undefined) {
        handleUpdateServer('enabled', result.enabled);
      }
      if (result.connected !== undefined) {
        handleUpdateServer('connected', result.connected);
      }
      if (result.version !== undefined) {
        handleUpdateServer('version', result.version);
      }

      toast({
        title: "Success",
        description: `Server ${serverState.selectedServer.id === 0 ? 'created' : 'updated'} successfully`
      });

      // Reload servers list
      await loadServers();

    } catch (error) {
      console.error('Error saving server:', error);
      toast({
        title: "Error",
        description: "Failed to save server",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!serverState.selectedServer?.id) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/casparcg/servers/${serverState.selectedServer.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete server');

      toast({
        title: "Success",
        description: "Server deleted successfully"
      });

      await loadServers();
      serverState.setSelectedServer(null);
    } catch (error) {
      console.error('Error deleting server:', error);
      toast({
        title: "Error",
        description: "Failed to delete server",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!serverState.selectedServer) return;

    try {
      setIsTesting(true);
      setConnectionStatus("Starting connection test...");
      
      const connected = await testServerConnection(serverState.selectedServer);
      
      serverState.setSelectedServer(connected);

      // Actualizar el servidor en la lista
      serverState.updateServer(connected);

      toast({
        title: "Connection Successful",
        description: `Successfully connected to ${serverState.selectedServer.name}`,
      });
    } catch (error) {
      // El error ya se maneja en testServerConnection
      console.error('Connection test failed:', error);
    } finally {
      setIsTesting(false);
      setConnectionStatus("");
    }
  };

  const handleUpdateServerField = (field: string | number | symbol, value: string | number) => {
    if (serverState.selectedServer) {
      serverState.setSelectedServer({
        ...serverState.selectedServer,
        [field]: value
      });
    }
  };

  const handleNew = () => {
    serverState.setSelectedServer({
      id: 0,
      name: '',
      host: 'localhost',
      port: 5250,
      description: '',
      username: '',
      password: '',
      preview_channel: 2,
      locked_channel: 1,
      is_shadow: false,
      enabled: true,
      connected: false,
      version: '',
      channel_formats: ''
    });
  };

  return (
    <div className="grid grid-cols-[350px,1fr] gap-6 h-[600px]">
      {/* Lista de servidores */}
      <div className="border-r border-gray-700 pr-6 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-foreground">Name</TableHead>
              <TableHead className="text-foreground">Enabled</TableHead>
              <TableHead className="text-foreground">Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {optimisticServers.map((server) => (
              <TableRow 
                key={server.id}
                className={cn(
                  "cursor-pointer text-foreground",
                  serverState.selectedServer?.id === server.id && "bg-accent"
                )}
                onClick={() => serverState.setSelectedServer(server)}
              >
                <TableCell className="text-foreground">{server.name}</TableCell>
                <TableCell>
                  <Badge variant={server.enabled ? "default" : "secondary"} className="text-foreground">
                    {server.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </TableCell>
                <TableCell className="text-foreground">{server.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Panel de configuración */}
      {serverState.selectedServer ? (
        <div className="overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Server Name</Label>
                <Input
                  id="name"
                  value={serverState.selectedServer.name}
                  onChange={(e) => handleUpdateServer('name', e.target.value)}
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="host" className="text-foreground">Host</Label>
                <Input
                  id="host"
                  value={serverState.selectedServer.host}
                  onChange={(e) => handleUpdateServer('host', e.target.value)}
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port" className="text-foreground">Port</Label>
                <Input
                  id="port"
                  type="number"
                  value={serverState.selectedServer.port}
                  onChange={(e) => handleUpdateServer('port', parseInt(e.target.value))}
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-foreground">Description</Label>
                <Input
                  id="description"
                  value={serverState.selectedServer.description || ''}
                  onChange={(e) => handleUpdateServer('description', e.target.value)}
                  className="text-foreground"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="enabled"
                  checked={serverState.selectedServer.enabled}
                  onCheckedChange={(checked) => handleUpdateServer('enabled', checked)}
                />
                <Label htmlFor="enabled" className="text-foreground">Enabled</Label>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-foreground">Server Version</Label>
                <div className="p-2 bg-secondary/20 rounded-md text-foreground">
                  {serverState.selectedServer.version || 'Not connected'}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Channels</Label>
                <div className="space-y-1">
                  {serverState.selectedServer.channel_formats ? (
                    serverState.selectedServer.channel_formats.split(',').map((channel, index) => (
                      <div key={index} className="p-2 bg-secondary/20 rounded-md text-foreground">
                        Channel {index + 1}: {channel}
                      </div>
                    ))
                  ) : (
                    <div className="p-2 bg-secondary/20 rounded-md text-foreground">
                      Not connected
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={serverState.selectedServer.is_shadow}
                  onCheckedChange={(checked) => handleUpdateServer('is_shadow', checked)}
                />
                <Label className="text-foreground">Shadow Server</Label>
              </div>
            </div>
          </div>

          {/* Connection Controls */}
          <div className="flex-none p-4 bg-accent/50 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    serverState.selectedServer.connected ? "bg-green-500" : "bg-red-500"
                  )} />
                  <span className="text-sm font-medium text-foreground">
                    {serverState.selectedServer.connected ? "Connected" : "Disconnected"}
                  </span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleConnectServer(serverState.selectedServer)}
                  disabled={isTesting}
                  className="text-foreground"
                >
                  {serverState.selectedServer.connected ? "Disconnect" : "Connect"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="text-foreground"
                >
                  Test Connection
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                  disabled={isLoading}
                  className="text-foreground"
                >
                  Save Changes
                </Button>
              </div>
              <div className="text-sm text-foreground">
                {connectionStatus}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">No server selected</p>
            <Button variant="outline" onClick={handleNew} className="text-foreground">
              Create New Server
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}