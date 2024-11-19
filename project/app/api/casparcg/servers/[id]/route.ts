import { NextResponse } from 'next/server';
import getDb from '@/db';
import { CasparServer } from '@/server/device/caspar/CasparServer';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDb();
    const server = await db.get(
      'SELECT * FROM casparcg_servers WHERE id = ?',
      params.id
    );
    
    if (!server) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    // Convertir valores booleanos
    server.enabled = server.enabled === 1;
    server.is_shadow = server.is_shadow === 1;

    // Obtener el estado actual del servidor
    let state = { connected: false };
    try {
      state = await CasparServer.getState(parseInt(params.id));
    } catch (error) {
      console.warn(`Could not get state for server ${params.id}:`, error);
    }

    return NextResponse.json({
      ...server,
      ...state
    });
  } catch (error) {
    console.error('Error fetching CasparCG server:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch server', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('Updating server with ID:', params.id);
  try {
    const data = await request.json();
    console.log('Update data:', data);
    
    // Validar y convertir valores booleanos
    const enabled = data.enabled === true ? 1 : 0;
    const is_shadow = data.is_shadow === true ? 1 : 0;
    
    const db = await getDb();
    
    await db.run(`
      UPDATE casparcg_servers SET
        name = ?, host = ?, port = ?, description = ?,
        username = ?, password = ?, preview_channel = ?,
        locked_channel = ?, is_shadow = ?, enabled = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      data.name,
      data.host,
      data.port,
      data.description || null,
      data.username || null,
      data.password || null,
      data.preview_channel || null,
      data.locked_channel || null,
      is_shadow,
      enabled,
      params.id
    ]);

    // Obtener el servidor actualizado
    const updatedServer = await db.get(
      'SELECT * FROM casparcg_servers WHERE id = ?',
      params.id
    );

    // Convertir valores booleanos para la respuesta
    updatedServer.enabled = updatedServer.enabled === 1;
    updatedServer.is_shadow = updatedServer.is_shadow === 1;

    console.log('Server updated successfully');
    return NextResponse.json(updatedServer);
  } catch (error) {
    console.error('Error updating CasparCG server:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update server', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDb();
    
    // Verificar si el servidor existe
    const server = await db.get(
      'SELECT * FROM casparcg_servers WHERE id = ?',
      params.id
    );
    
    if (!server) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    // Intentar desconectar el servidor si está conectado
    try {
      const casparServer = CasparServer.getInstance({
        id: server.id,
        name: server.name,
        host: server.host,
        port: server.port,
        enabled: false
      });
      await casparServer.disconnect();
    } catch (error) {
      console.warn(`Could not disconnect server ${params.id}:`, error);
    }

    // Eliminar el servidor de la base de datos
    await db.run('DELETE FROM casparcg_servers WHERE id = ?', params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting CasparCG server:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to delete server', details: errorMessage },
      { status: 500 }
    );
  }
}

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
      is_shadow: server.is_shadow === 1
    });

    console.log('Attempting to connect to server:', server.name);
    const connected = await casparServer.connect();
    
    if (!connected) {
      console.error('Failed to connect to server:', server.name);
      return NextResponse.json({
        connected: false,
        version: undefined,
        channels: undefined
      });
    }

    console.log('Successfully connected to server:', server.name);
    const version = await casparServer.getVersion();
    console.log('Server version:', version);
    
    const systemInfo = await casparServer.getSystemInfo();
    console.log('System info:', systemInfo);
    
    // Parse system info to get channels
    const channels = parseSystemInfo(systemInfo);
    console.log('Parsed channels:', channels);
    
    // Actualizar la información del servidor en la base de datos
    await db.run(`
      UPDATE casparcg_servers 
      SET version = ?, channel_formats = ?, last_connection = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [version, JSON.stringify(channels), params.id]);
    
    // Solo desconectar si el servidor no estaba previamente conectado
    if (!server.enabled) {
      console.log('Server not enabled, disconnecting...');
      await casparServer.disconnect();
    } else {
      console.log('Server enabled, keeping connection open');
    }

    console.log('Returning server info:', { version, channels });
    return NextResponse.json({
      connected: true,
      version,
      channels
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

function parseSystemInfo(info: string): string[] {
  console.log('Parsing system info:', info);
  const lines = info.split('\r\n');
  const channels: string[] = [];

  for (const line of lines) {
    // Buscar líneas que contengan información de canales
    if (line.match(/^\d+\s+\w+/)) {
      channels.push(line.trim());
    }
  }

  console.log('Parsed channels:', channels);
  return channels;
}