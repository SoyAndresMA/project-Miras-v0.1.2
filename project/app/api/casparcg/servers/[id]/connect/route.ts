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
    
    try {
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
        return NextResponse.json(
          { 
            error: 'Failed to connect to server',
            details: `Could not establish connection to ${server.name} (${server.host}:${server.port})`
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        success: true,
        message: `Successfully connected to ${server.name}`,
        server: {
          id: server.id,
          name: server.name,
          host: server.host,
          port: server.port,
          connected: true
        }
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
