import { NextResponse } from 'next/server';
import { getDb } from '@/server/db';

export async function GET(
  request: Request,
  { params }: { params: { serverId: string } }
) {
  try {
    const db = await getDb();
    const server = await db.get(`
      SELECT media_files
      FROM casparcg_servers
      WHERE id = ?
    `, [params.serverId]);

    if (!server) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      mediaFiles: server.media_files ? JSON.parse(server.media_files) : []
    });
  } catch (error) {
    console.error('Error fetching media files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media files' },
      { status: 500 }
    );
  }
}
