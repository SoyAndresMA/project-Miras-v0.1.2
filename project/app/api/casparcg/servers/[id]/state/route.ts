import { NextResponse } from 'next/server';
import { getServerState } from '@/lib/casparcg';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const serverId = parseInt(params.id);
    if (isNaN(serverId)) {
      return NextResponse.json(
        { error: 'Invalid server ID' },
        { status: 400 }
      );
    }

    const state = await getServerState(serverId);
    return NextResponse.json(state);
  } catch (error) {
    console.error('Error getting server state:', error);
    return NextResponse.json(
      { error: 'Failed to get server state' },
      { status: 500 }
    );
  }
}
