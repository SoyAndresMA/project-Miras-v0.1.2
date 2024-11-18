import { NextResponse } from 'next/server';
import getDb from '@/db';
import { z } from 'zod';

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
  enabled: z.boolean().default(true)
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
    console.log('Creating new CasparCG server:', data);

    // Validar datos
    const validatedData = serverSchema.parse(data);
    
    const db = await getDb();
    
    // Verificar si ya existe un servidor con el mismo nombre o host:port
    const existing = await db.get(
      'SELECT id FROM casparcg_servers WHERE name = ? OR (host = ? AND port = ?)',
      [validatedData.name, validatedData.host, validatedData.port]
    );

    if (existing) {
      return NextResponse.json(
        { error: 'A server with the same name or host:port combination already exists' },
        { status: 409 }
      );
    }
    
    const result = await db.run(`
      INSERT INTO casparcg_servers (
        name, host, port, description, username, password,
        preview_channel, locked_channel, is_shadow, enabled,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
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
    ]);

    // Obtener el servidor recién creado
    const newServer = await db.get('SELECT * FROM casparcg_servers WHERE id = ?', result.lastID);

    console.log('Server created with ID:', result.lastID);
    return NextResponse.json(newServer);
  } catch (error) {
    console.error('Error creating CasparCG server:', error);
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
    console.log('Updating CasparCG server:', data);

    // Validar datos
    const validatedData = serverSchema.parse(data);
    
    const db = await getDb();
    
    // Verificar si ya existe otro servidor con el mismo nombre o host:port
    const existing = await db.get(
      'SELECT id FROM casparcg_servers WHERE (name = ? OR (host = ? AND port = ?)) AND id != ?',
      [validatedData.name, validatedData.host, validatedData.port, data.id]
    );

    if (existing) {
      return NextResponse.json(
        { error: 'A server with the same name or host:port combination already exists' },
        { status: 409 }
      );
    }
    
    await db.run(`
      UPDATE casparcg_servers 
      SET 
        name = ?, 
        host = ?, 
        port = ?, 
        description = ?, 
        username = ?, 
        password = ?,
        preview_channel = ?, 
        locked_channel = ?, 
        is_shadow = ?, 
        enabled = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
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
    ]);

    // Obtener el servidor actualizado
    const updatedServer = await db.get('SELECT * FROM casparcg_servers WHERE id = ?', data.id);

    console.log('Server updated successfully');
    return NextResponse.json(updatedServer);
  } catch (error) {
    console.error('Error updating CasparCG server:', error);
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