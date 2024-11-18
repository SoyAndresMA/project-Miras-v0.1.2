"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { DeviceConfig } from '@/lib/types/device';
import { Loader2 } from 'lucide-react';

export function ServersCasparCG() {
  const [servers, setServers] = useState<DeviceConfig[]>([]);
  const [selectedServer, setSelectedServer] = useState<DeviceConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const { toast } = useToast();

  // Función para probar la conexión de un servidor específico
  const testServerConnection = async (server: DeviceConfig) => {
    console.log(`Testing connection for server ${server.name}...`, server);
    try {
      const response = await fetch(`/api/casparcg/servers/${server.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(server)
      });

      if (!response.ok) {
        console.error(`Connection test failed for ${server.name}:`, response.statusText);
        throw new Error(`Connection test failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`Connection result for ${server.name}:`, result);
      
      if (!result.connected) {
        console.warn(`Server ${server.name} connection test failed:`, result);
      }

      return {
        ...server,
        connected: result.connected,
        version: result.version,
        channel_formats: result.channels?.join('\n') || ''
      };
    } catch (error) {
      console.error('Error testing connection for server:', server.name, error);
      toast({
        title: "Connection Error",
        description: `Failed to connect to ${server.name}`,
        variant: "destructive"
      });
      return {
        ...server,
        connected: false,
        version: undefined,
        channel_formats: undefined
      };
    }
  };

  // Función para intentar conectar a un servidor
  const handleConnectServer = async (server: DeviceConfig) => {
    console.log('Attempting to connect to server:', server.name);
    try {
      setIsTesting(true);
      const updatedServer = await testServerConnection(server);
      
      // Actualizar el servidor en la lista
      setServers(prevServers => 
        prevServers.map(s => 
          s.id === updatedServer.id ? updatedServer : s
        )
      );

      // Si es el servidor seleccionado, actualizar también el estado
      if (selectedServer?.id === updatedServer.id) {
        setSelectedServer(updatedServer);
      }

      return updatedServer.connected;
    } catch (error) {
      console.error('Error connecting to server:', error);
      return false;
    } finally {
      setIsTesting(false);
    }
  };

  // Manejar doble clic en un servidor
  const handleServerDoubleClick = async (server: DeviceConfig) => {
    if (!server.connected) {
      await handleConnectServer(server);
    }
  };

  // Cargar servidores y su estado inicial
  const loadServers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/casparcg/servers');
      if (!response.ok) throw new Error('Failed to fetch servers');
      const data = await response.json();
      
      // Cargar el estado de conexión para cada servidor
      const serversWithState = await Promise.all(
        data.map(async (server: DeviceConfig) => {
          try {
            const stateResponse = await fetch(`/api/casparcg/servers/${server.id}/state`);
            if (stateResponse.ok) {
              const stateData = await stateResponse.json();
              return { ...server, connected: stateData.connected };
            }
          } catch (error) {
            console.error(`Error fetching state for server ${server.id}:`, error);
          }
          return server;
        })
      );

      setServers(serversWithState);
    } catch (error) {
      console.error('Error loading servers:', error);
      toast({
        title: "Error",
        description: "Failed to load servers",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Efecto para cargar servidores al montar el componente
  useEffect(() => {
    loadServers();
  }, []);

  // Efecto para mantener la conexión activa
  useEffect(() => {
    const checkConnections = async () => {
      const connectedServers = servers.filter(s => s.connected);
      for (const server of connectedServers) {
        try {
          const response = await fetch(`/api/casparcg/servers/${server.id}/state`);
          if (!response.ok) {
            // Si el servidor no responde, intentar reconectar
            await handleConnectServer(server);
          }
        } catch (error) {
          console.error(`Error checking connection for server ${server.id}:`, error);
        }
      }
    };

    // Verificar conexiones cada 30 segundos
    const interval = setInterval(checkConnections, 30000);
    return () => clearInterval(interval);
  }, [servers]);

  const handleNew = () => {
    setSelectedServer({
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
      connected: false
    });
  };

  const handleSave = async () => {
    if (!selectedServer) return;

    try {
      console.log('Saving server:', selectedServer);
      setIsLoading(true);
      
      const endpoint = selectedServer.id === 0 
        ? '/api/casparcg/servers' 
        : `/api/casparcg/servers/${selectedServer.id}`;
        
      const response = await fetch(endpoint, {
        method: selectedServer.id === 0 ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedServer),
      });

      if (!response.ok) throw new Error('Failed to save server');

      console.log('Server saved successfully');
      toast({
        title: "Success",
        description: `Server ${selectedServer.id === 0 ? 'created' : 'updated'} successfully`
      });

      // Recargar todos los servidores
      await loadServers();

      // Si el servidor estaba conectado, intentar reconectar
      if (selectedServer.connected) {
        const updatedServer = servers.find(s => s.id === selectedServer.id);
        if (updatedServer) {
          await handleConnectServer(updatedServer);
        }
      }

      setSelectedServer(null);
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
    if (!selectedServer?.id) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/casparcg/servers/${selectedServer.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete server');

      toast({
        title: "Success",
        description: "Server deleted successfully"
      });

      await loadServers();
      setSelectedServer(null);
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
    if (!selectedServer) return;

    try {
      setIsTesting(true);
      const updatedServer = await testServerConnection(selectedServer);
      setSelectedServer(updatedServer);
      
      // Actualizar el servidor en la lista
      setServers(prevServers => 
        prevServers.map(server => 
          server.id === updatedServer.id ? updatedServer : server
        )
      );
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4 p-4">
      {/* Lista de Servidores */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">CasparCG Servers</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNew}
          >
            Add Server
          </Button>
        </div>

        <div className="space-y-2">
          {servers.map((server) => (
            <div
              key={server.id}
              className={`flex items-center space-x-4 p-3 rounded-lg cursor-pointer hover:bg-gray-700 ${
                selectedServer?.id === server.id ? 'bg-gray-700' : 'bg-gray-800'
              }`}
              onClick={() => setSelectedServer(server)}
              onDoubleClick={() => handleServerDoubleClick(server)}
            >
              <div className="flex-grow">
                <div className="font-medium">{server.name}</div>
                <div className="text-sm text-gray-400">{server.host}:{server.port}</div>
              </div>
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  server.connected ? 'bg-green-500' : 'bg-red-500'
                }`}
              >
                <Loader2 className={`h-5 w-5 text-white ${isTesting && selectedServer?.id === server.id ? 'animate-spin' : ''}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Server Details */}
      {selectedServer && (
        <div className="col-span-2 space-y-4">
          <div className="space-y-4 py-2 pb-4">
            <div className="space-y-2">
              <Label htmlFor="name">Server Name</Label>
              <Input
                id="name"
                value={selectedServer.name}
                onChange={(e) => setSelectedServer(prev => prev ? {
                  ...prev,
                  name: e.target.value
                } : null)}
                className="bg-gray-700 border-gray-600"
              />
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex-grow space-y-2">
                <Label htmlFor="host">Host</Label>
                <Input
                  id="host"
                  value={selectedServer.host}
                  onChange={(e) => setSelectedServer(prev => prev ? {
                    ...prev,
                    host: e.target.value
                  } : null)}
                  className="bg-gray-700 border-gray-600"
                />
              </div>
              <div className="w-32 space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  value={selectedServer.port}
                  onChange={(e) => setSelectedServer(prev => prev ? {
                    ...prev,
                    port: parseInt(e.target.value)
                  } : null)}
                  className="bg-gray-700 border-gray-600"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => handleConnectServer(selectedServer)}
                disabled={isTesting}
                className="text-black"
              >
                {isTesting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Loader2 className="mr-2 h-4 w-4" />
                )}
                Connect
              </Button>

              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="text-black"
              >
                Test Connection
              </Button>

              {selectedServer?.connected !== undefined && (
                <div className={`flex items-center ${selectedServer.connected ? 'text-green-500' : 'text-red-500'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${selectedServer.connected ? 'bg-green-500' : 'bg-red-500'}`}>
                    <Loader2 className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-lg">{selectedServer.connected ? 'Connected' : 'Disconnected'}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Server Version</Label>
              <Input
                value={selectedServer.version || ""}
                readOnly
                disabled
                className="bg-gray-800 border-gray-700 text-gray-400"
              />
            </div>

            <div className="space-y-2">
              <Label>Channel Information</Label>
              <Input
                value={selectedServer.channel_formats || ""}
                readOnly
                disabled
                className="bg-gray-800 border-gray-700 text-gray-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={selectedServer.description || ''}
                onChange={(e) => setSelectedServer(prev => prev ? {
                  ...prev,
                  description: e.target.value
                } : null)}
                className="bg-gray-700 border-gray-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preview">Preview Channel</Label>
              <Input
                id="preview"
                type="number"
                value={selectedServer.preview_channel || ''}
                onChange={(e) => setSelectedServer(prev => prev ? {
                  ...prev,
                  preview_channel: parseInt(e.target.value)
                } : null)}
                className="bg-gray-700 border-gray-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="locked">Locked Channel</Label>
              <Input
                id="locked"
                type="number"
                value={selectedServer.locked_channel || ''}
                onChange={(e) => setSelectedServer(prev => prev ? {
                  ...prev,
                  locked_channel: parseInt(e.target.value)
                } : null)}
                className="bg-gray-700 border-gray-600"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enabled"
                checked={selectedServer.enabled}
                onCheckedChange={(checked) => setSelectedServer(prev => prev ? {
                  ...prev,
                  enabled: checked as boolean
                } : null)}
                className="border-gray-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <Label htmlFor="enabled">Enabled</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="shadow"
                checked={selectedServer.is_shadow}
                onCheckedChange={(checked) => setSelectedServer(prev => prev ? {
                  ...prev,
                  is_shadow: checked as boolean
                } : null)}
                className="border-gray-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <Label htmlFor="shadow">Shadow Server</Label>
            </div>
          </div>

          <div className="flex justify-between pt-6">
            <div className="space-x-2">
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-500"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Save'
                )}
              </Button>
            </div>
            
            {selectedServer.id !== 0 && (
              <Button
                onClick={handleDelete}
                disabled={isLoading}
                variant="destructive"
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}