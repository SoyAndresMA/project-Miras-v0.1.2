import { NextResponse } from 'next/server';
import getDb from '@/db';

export async function GET() {
  try {
    console.log('Fetching all CasparCG servers...');
    const db = await getDb();
    const servers = await db.all('SELECT * FROM casparcg_servers ORDER BY name');
    console.log('Found servers:', servers);
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
    const db = await getDb();
    
    const result = await db.run(`
      INSERT INTO casparcg_servers (
        name, host, port, description, username, password,
        preview_channel, locked_channel, is_shadow, enabled,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      data.name,
      data.host,
      data.port,
      data.description || null,
      data.username || null,
      data.password || null,
      data.preview_channel || null,
      data.locked_channel || null,
      data.is_shadow ? 1 : 0,
      data.enabled ? 1 : 0
    ]);

    console.log('Server created with ID:', result.lastID);
    return NextResponse.json({ id: result.lastID });
  } catch (error) {
    console.error('Error creating CasparCG server:', error);
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
    const db = await getDb();
    
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
      data.name,
      data.host,
      data.port,
      data.description || null,
      data.username || null,
      data.password || null,
      data.preview_channel || null,
      data.locked_channel || null,
      data.is_shadow ? 1 : 0,
      data.enabled ? 1 : 0,
      data.id
    ]);

    console.log('Server updated successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating CasparCG server:', error);
    return NextResponse.json(
      { error: 'Failed to update server' },
      { status: 500 }
    );
  }
}