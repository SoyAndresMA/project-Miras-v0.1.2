import { NextResponse } from 'next/server';
import getDb from '@/db';
import { z } from 'zod';
import { CasparServer } from '@/server/device/caspar/CasparServer';

// Schema de validación para servidores CasparCG
const serverSchema = z.object({
  name: z.string().min(1, "Name is required"),
  host: z.string().min(1, "Host is required"),
  port: z.number().int().min(1024).max(65535),
  description: z.string().optional().nullable(),
  username: z.string().optional().nullable(),
  password: z.string().optional().nullable(),
  preview_channel: z.number().int().min(1).optional().nullable(),
  locked_channel: z.number().int().min(1).optional().nullable(),
  is_shadow: z.boolean().default(false),
  enabled: z.boolean().default(true),
  command_timeout: z.number().int().optional().nullable()
});

export async function GET() {
  try {
    const db = await getDb();
    const servers = await db.all('SELECT * FROM casparcg_servers ORDER BY name');
    return NextResponse.json(servers);
  } catch (error) {
    console.error('Error fetching CasparCG servers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch servers' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const validatedData = serverSchema.parse(data);
    const database = await getDb();

    const result = await database.run(
      `INSERT INTO casparcg_servers (
        name, host, port, description, username, password,
        preview_channel, locked_channel, is_shadow, enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        validatedData.name,
        validatedData.host,
        validatedData.port,
        validatedData.description,
        validatedData.username,
        validatedData.password,
        validatedData.preview_channel,
        validatedData.locked_channel,
        validatedData.is_shadow ? 1 : 0,
        validatedData.enabled ? 1 : 0
      ]
    );

    const serverId = result.lastID;

    try {
      // Inicializar el servidor CasparCG
      const server = CasparServer.getInstance({
        id: serverId,
        name: validatedData.name,
        host: validatedData.host,
        port: validatedData.port,
        enabled: validatedData.enabled,
        commandTimeout: validatedData.command_timeout || 5000
      });

      // Intentar inicializar el servidor si está habilitado
      if (validatedData.enabled) {
        await server.initialize();
      }

      return NextResponse.json({ 
        id: serverId,
        connected: server.isConnected(),
        version: server.getServerState().version || null
      });
    } catch (serverError) {
      console.error('Error initializing server:', serverError);
      return NextResponse.json({ 
        id: serverId,
        connected: false,
        error: serverError.message
      });
    }
  } catch (error) {
    console.error('Error creating server:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid server data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create server' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const validatedData = serverSchema.parse(data);
    const database = await getDb();

    // Obtener el estado actual del servidor
    const currentServer = await database.get(
      'SELECT enabled FROM casparcg_servers WHERE id = ?',
      [data.id]
    );

    if (!currentServer) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    // Actualizar la base de datos
    await database.run(
      `UPDATE casparcg_servers SET
        name = ?, host = ?, port = ?, description = ?,
        username = ?, password = ?, preview_channel = ?,
        locked_channel = ?, is_shadow = ?, enabled = ?
        WHERE id = ?`,
      [
        validatedData.name,
        validatedData.host,
        validatedData.port,
        validatedData.description,
        validatedData.username,
        validatedData.password,
        validatedData.preview_channel,
        validatedData.locked_channel,
        validatedData.is_shadow ? 1 : 0,
        validatedData.enabled ? 1 : 0,
        data.id
      ]
    );

    try {
      // Obtener o crear la instancia del servidor
      const server = CasparServer.getInstance({
        id: data.id,
        name: validatedData.name,
        host: validatedData.host,
        port: validatedData.port,
        enabled: validatedData.enabled,
        commandTimeout: validatedData.command_timeout || 5000
      });

      // Si el servidor está habilitado y no estaba habilitado antes, o si cambió la configuración
      if (validatedData.enabled && 
          (!currentServer.enabled || 
           currentServer.host !== validatedData.host || 
           currentServer.port !== validatedData.port)) {
        console.log('Initializing server connection...');
        await server.initialize();
      }
      // Si el servidor está deshabilitado y estaba habilitado antes
      else if (!validatedData.enabled && currentServer.enabled) {
        console.log('Disconnecting server...');
        await server.disconnect();
      }

      const serverState = server.getServerState();
      return NextResponse.json({ 
        success: true,
        connected: server.isConnected(),
        version: serverState.version || null,
        enabled: validatedData.enabled
      });
    } catch (serverError) {
      console.error('Error managing server connection:', serverError);
      return NextResponse.json({ 
        success: true,
        connected: false,
        error: serverError.message,
        enabled: validatedData.enabled
      });
    }
  } catch (error) {
    console.error('Error updating server:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid server data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update server' },
      { status: 500 }
    );
  }
}