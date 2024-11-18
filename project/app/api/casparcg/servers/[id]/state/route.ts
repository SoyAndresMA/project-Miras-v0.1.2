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
    
    // Obtener el estado del servidor usando CasparServer
    const state = await CasparServer.getState(serverId);
    
    // Actualizar el estado en la base de datos
    await database.run(
      'UPDATE casparcg_servers SET enabled = ?, version = ?, last_connection = CURRENT_TIMESTAMP WHERE id = ?',
      [state.connected ? 1 : 0, state.version || null, serverId]
    );

    return NextResponse.json(state);
  } catch (error) {
    console.error(' Error al obtener estado del servidor:', error);
    return NextResponse.json(
      { error: 'Failed to get server state' },
      { status: 500 }
    );
  }
}
