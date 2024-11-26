import { NextResponse } from 'next/server';
import getDb from '@/app/api/db';
import { CasparServer } from '@/server/device/caspar/CasparServer';

export async function POST(
  request: Request,
  { params }: { params: { serverId: string } }
) {
  console.log('Testing connection for server ID:', params.serverId);
  
  try {
    const db = await getDb();
    const server = await db.get(
      'SELECT * FROM casparcg_servers WHERE id = ?',
      params.serverId
    );
    
    if (!server) {
      console.error('Server not found:', params.serverId);
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    console.log('Found server:', server);
    
    try {
      // Primero intentamos obtener una instancia existente
      let casparServer = CasparServer.getExistingInstance(server.id);
      
      // Si no existe, creamos una nueva instancia
      if (!casparServer) {
        casparServer = await CasparServer.getInstance({
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
      }

      console.log('Attempting to connect to server:', server.name);
      
      // Si ya está conectado, desconectamos primero
      if (casparServer.isConnected()) {
        await casparServer.disconnect();
      }
      
      // Intentamos inicializar
      await casparServer.initialize();
      
      // Verificamos el estado después de la inicialización
      const serverState = await CasparServer.getState(server.id);
      
      if (!serverState.connected) {
        console.error('Failed to connect to server:', server.name);
        return NextResponse.json(
          { 
            error: 'Failed to connect to server',
            details: 'Connection attempt failed'
          },
          { status: 500 }
        );
      }

      console.log('Successfully connected to server:', server.name);
      return NextResponse.json({
        success: true,
        message: 'Connected successfully',
        state: serverState
      });

    } catch (error: any) {
      console.error('Error connecting to server:', error);
      return NextResponse.json(
        { 
          error: 'Error connecting to server',
          details: error.message || 'Unknown error',
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        error: 'Database error',
        details: error.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
