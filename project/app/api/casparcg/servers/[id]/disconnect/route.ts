import { NextResponse } from 'next/server';
import { CasparServer } from '@/server/device/caspar/CasparServer';
import getDb from '@/db';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('Disconnecting from server ID:', params.id);
  
  try {
    const db = await getDb();
    const server = await db.get(
      'SELECT * FROM casparcg_servers WHERE id = ?',
      params.id
    );
    
    if (!server) {
      console.error('Server not found:', params.id);
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    console.log('Found server:', server);
    const casparServer = CasparServer.getInstance({
      id: server.id,
      name: server.name,
      host: server.host,
      port: server.port,
      enabled: server.enabled === 1,
      description: server.description,
      username: server.username,
      password: server.password,
      preview_channel: server.preview_channel,
      locked_channel: server.locked_channel,
      is_shadow: server.is_shadow === 1,
      connected: false
    });

    console.log('Attempting to disconnect from server:', server.name);
    await casparServer.disconnect();
    
    // Actualizar la información del servidor en la base de datos
    await db.run(`
      UPDATE casparcg_servers 
      SET enabled = ?, last_connection = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [0, params.id]);
    
    return NextResponse.json({
      id: server.id,
      connected: false
    });
  } catch (error) {
    console.error('Error disconnecting from server:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to disconnect', details: errorMessage },
      { status: 500 }
    );
  }
}
