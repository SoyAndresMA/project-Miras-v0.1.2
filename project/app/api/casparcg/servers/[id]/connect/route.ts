import { NextResponse } from 'next/server';
import { CasparServer } from '@/server/device/caspar/CasparServer';
import getDb from '@/db';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('Testing connection for server ID:', params.id);
  
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

    console.log('Attempting to connect to server:', server.name);
    const connected = await casparServer.connect();
    
    if (!connected) {
      console.error('Failed to connect to server:', server.name);
      return NextResponse.json({
        id: server.id,
        connected: false,
        version: null,
        channels: []
      });
    }

    console.log('Successfully connected to server:', server.name);
    const state = await CasparServer.getState(server.id);
    console.log('Server state:', state);
    
    // Actualizar la información del servidor en la base de datos
    await db.run(`
      UPDATE casparcg_servers 
      SET version = ?, enabled = ?, last_connection = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [state.version, connected ? 1 : 0, params.id]);
    
    return NextResponse.json({
      id: server.id,
      ...state
    });
  } catch (error) {
    console.error('Error testing server connection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to test connection', details: errorMessage },
      { status: 500 }
    );
  }
}
