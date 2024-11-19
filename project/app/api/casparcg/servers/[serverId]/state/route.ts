import { NextResponse } from 'next/server';
import { CasparServer } from '@/server/device/caspar/CasparServer';
import getDb from '@/db';

export async function GET(
  request: Request,
  { params }: { params: { serverId: string } }
) {
  console.log(' Verificando estado del servidor:', params.serverId);
  try {
    const serverId = parseInt(params.serverId);
    if (isNaN(serverId)) {
      console.error(' ID de servidor inválido:', params.serverId);
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

    // Obtener la instancia del servidor y su estado actual
    const server = await CasparServer.getInstance({
      id: serverConfig.id,
      name: serverConfig.name,
      host: serverConfig.host,
      port: serverConfig.port,
      enabled: Boolean(serverConfig.enabled),
      commandTimeout: serverConfig.command_timeout || 5000
    });

    // Obtener el estado actual del servidor
    const serverState = server.getServerState();
    
    return NextResponse.json(serverState);
  } catch (error) {
    console.error(' Error al verificar estado:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
