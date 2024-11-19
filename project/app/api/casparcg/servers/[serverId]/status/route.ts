import { NextResponse } from 'next/server';
import getDb from '@/app/api/db';
import { CasparServer } from '@/server/device/caspar/CasparServer';

export async function POST(
  request: Request,
  { params }: { params: { serverId: string } }
) {
  try {
    const { connected, mediaFiles } = await request.json();
    const db = await getDb();
    
    await db.run(`
      UPDATE casparcg_servers 
      SET media_files = ?, last_connection = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [mediaFiles, params.serverId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating server status:', error);
    return NextResponse.json(
      { error: 'Failed to update server status' },
      { status: 500 }
    );
  }
}