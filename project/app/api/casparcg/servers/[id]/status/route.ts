import { NextResponse } from 'next/server';
import getDb from '@/db';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { connected } = await request.json();
    const db = await getDb();
    
    await db.run(`
      UPDATE casparcg_servers 
      SET last_connection = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [params.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating server status:', error);
    return NextResponse.json(
      { error: 'Failed to update server status' },
      { status: 500 }
    );
  }
}