import { DeviceConfig } from '@/types/device';
import { db } from '@/lib/db';

export async function getServerState(serverId: number) {
  try {
    // Obtener el servidor de la base de datos
    const server = await db.device.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      throw new Error('Server not found');
    }

    // Intentar conectar al servidor CasparCG
    const response = await fetch(`http://${server.host}:${server.port}/api/version`);
    
    if (!response.ok) {
      return {
        connected: false,
        version: null,
        channels: []
      };
    }

    // Si la conexión es exitosa, obtener la información del servidor
    const versionInfo = await response.json();
    
    // También podríamos obtener información de los canales
    const channelsResponse = await fetch(`http://${server.host}:${server.port}/api/channels`);
    const channels = channelsResponse.ok ? await channelsResponse.json() : [];

    return {
      connected: true,
      version: versionInfo.version,
      channels: channels
    };
  } catch (error) {
    console.error('Error getting server state:', error);
    return {
      connected: false,
      version: null,
      channels: []
    };
  }
}

export async function testConnection(server: DeviceConfig) {
  try {
    const response = await fetch(`http://${server.host}:${server.port}/api/version`);
    if (!response.ok) {
      return {
        connected: false,
        version: null,
        channels: []
      };
    }

    const versionInfo = await response.json();
    return {
      connected: true,
      version: versionInfo.version,
      channels: []
    };
  } catch (error) {
    console.error('Error testing connection:', error);
    return {
      connected: false,
      version: null,
      channels: []
    };
  }
}

export async function connectServer(server: DeviceConfig) {
  try {
    // Intentar conectar al servidor
    const state = await testConnection(server);
    
    // Actualizar el estado en la base de datos
    await db.device.update({
      where: { id: server.id },
      data: {
        connected: state.connected,
        version: state.version || null
      }
    });

    return {
      ...server,
      ...state
    };
  } catch (error) {
    console.error('Error connecting to server:', error);
    return {
      ...server,
      connected: false,
      version: null,
      channels: []
    };
  }
}
