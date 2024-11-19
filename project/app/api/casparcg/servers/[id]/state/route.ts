import { NextResponse } from 'next/server';
import { CasparServer } from '@/server/device/caspar/CasparServer';
import getDb from '@/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(' Verificando estado del servidor:', params.id);
  try {
    const serverId = parseInt(params.id);
    if (isNaN(serverId)) {
      console.error(' ID de servidor inválido:', params.id);
      return NextResponse.json(
        { error: 'Invalid server ID' },
        { status: 400 }
      );
    }

    const database = await getDb();
    
    // Obtener la configuración del servidor de la base de datos
    const serverConfig = await database.get(
      'SELECT * FROM casparcg_servers WHERE id = ?',
      [serverId]
    );

    if (!serverConfig) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    // Solo obtener el estado si ya existe una instancia del servidor
    const server = CasparServer.getInstance({
      id: serverConfig.id,
      name: serverConfig.name,
      host: serverConfig.host,
      port: serverConfig.port,
      enabled: Boolean(serverConfig.enabled),
      commandTimeout: serverConfig.command_timeout || 5000
    });

    // Verificar si el servidor está conectado sin intentar conectarlo
    const isConnected = server.isConnected();
    
    return NextResponse.json({
      connected: isConnected,
      version: isConnected ? server.getServerState().version : null
    });
  } catch (error) {
    console.error(' Error al obtener estado del servidor:', error);
    return NextResponse.json(
      { error: 'Failed to get server state' },
      { status: 500 }
    );
  }
}
