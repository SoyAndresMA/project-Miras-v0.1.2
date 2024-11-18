import React, { useState, useEffect } from 'react';
import { DeviceConfig } from '@/types/device';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ServersCasparCGList } from './ServersCasparCGList';
import { ServersCasparCGSettings } from './ServersCasparCGSettings';

export function ServersCasparCG() {
  const [servers, setServers] = useState<DeviceConfig[]>([]);
  const [selectedServer, setSelectedServer] = useState<DeviceConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  // Función para probar la conexión con un servidor
  const testServerConnection = async (server: DeviceConfig) => {
    console.log(`🔌 Probando conexión con servidor ${server.name}...`);
    const response = await fetch(`/api/casparcg/servers/${server.id}/connect`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Connection test failed');
    }

    const data = await response.json();
    console.log(`✅ Resultado de la prueba de conexión:`, data);
    return data;
  };

  // Función para intentar conectar a un servidor
  const handleConnectServer = async (server: DeviceConfig) => {
    console.log(`🚀 Intentando conectar al servidor ${server.name}...`);
    try {
      setIsTesting(true);
      const updatedServer = await testServerConnection(server);
      
      setServers(prevServers => 
        prevServers.map(s => 
          s.id === updatedServer.id ? updatedServer : s
        )
      );

      if (selectedServer?.id === updatedServer.id) {
        setSelectedServer(updatedServer);
      }

      console.log(`✨ Conexión exitosa con ${server.name}`);
      return updatedServer.connected;
    } catch (error) {
      console.error('❌ Error al conectar con servidor:', error);
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
      console.log('🔄 Iniciando carga de servidores...');
      setIsLoading(true);
      const response = await fetch('/api/casparcg/servers');
      if (!response.ok) throw new Error('Failed to fetch servers');
      const data = await response.json();
      console.log('📋 Servidores encontrados:', data.length);
      
      // Cargar el estado de conexión para cada servidor
      console.log('🔍 Verificando estado de conexión de cada servidor...');
      const serversWithState = await Promise.all(
        data.map(async (server: DeviceConfig) => {
          console.log(`⚡ Comprobando servidor ${server.name} (ID: ${server.id})...`);
          try {
            const stateResponse = await fetch(`/api/casparcg/servers/${server.id}/state`);
            if (stateResponse.ok) {
              const stateData = await stateResponse.json();
              console.log(`✅ Estado del servidor ${server.name}: ${stateData.connected ? 'Conectado' : 'Desconectado'}`);
              return { ...server, connected: stateData.connected };
            }
          } catch (error) {
            console.error(`❌ Error al verificar estado del servidor ${server.id}:`, error);
          }
          return server;
        })
      );

      setServers(serversWithState);
      console.log('✨ Carga de servidores completada');
    } catch (error) {
      console.error('❌ Error loading servers:', error);
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
    <Tabs defaultValue="list" className="h-full space-y-6">
      <TabsList>
        <TabsTrigger value="list">Servers</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="list" className="h-[calc(100%-2.5rem)]">
        <ServersCasparCGList
          servers={servers}
          selectedServer={selectedServer}
          isLoading={isLoading}
          onSelectServer={setSelectedServer}
          onNewServer={handleNew}
          onConnectServer={handleConnectServer}
        />
      </TabsContent>
      <TabsContent value="settings">
        <ServersCasparCGSettings
          selectedServer={selectedServer}
          isTesting={isTesting}
          onSave={handleSave}
          onDelete={handleDelete}
          onConnectServer={handleConnectServer}
          onTestConnection={handleTestConnection}
        />
      </TabsContent>
    </Tabs>
  );
}