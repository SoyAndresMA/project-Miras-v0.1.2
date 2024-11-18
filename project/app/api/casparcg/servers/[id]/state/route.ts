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

    try {
      // Inicializar el servidor CasparCG con la configuración
      const server = CasparServer.getInstance({
        id: serverConfig.id,
        name: serverConfig.name,
        host: serverConfig.host,
        port: serverConfig.port,
        enabled: Boolean(serverConfig.enabled),
        commandTimeout: serverConfig.command_timeout || 5000
      });

      // Inicializar el servidor si aún no está conectado
      if (!server.isConnected()) {
        await server.initialize();
      }
      
      // Obtener el estado del servidor
      const state = await CasparServer.getState(serverId);
      
      // Actualizar el estado en la base de datos
      await database.run(
        'UPDATE casparcg_servers SET enabled = ?, version = ?, last_connection = CURRENT_TIMESTAMP WHERE id = ?',
        [state.connected ? 1 : 0, state.version || null, serverId]
      );

      return NextResponse.json(state);
    } catch (serverError) {
      console.error(' Error al inicializar/conectar con el servidor:', serverError);
      return NextResponse.json({
        connected: false,
        version: null,
        error: serverError.message
      });
    }
  } catch (error) {
    console.error(' Error al obtener estado del servidor:', error);
    return NextResponse.json(
      { error: 'Failed to get server state' },
      { status: 500 }
    );
  }
}
