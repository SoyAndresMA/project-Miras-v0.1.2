import { NextResponse } from 'next/server';
import { CasparServer } from '@/server/device/caspar/CasparServer';

export async function GET() {
  try {
    const server = await CasparServer.getInstance({
      id: 1,
      name: 'LENOVO',
      host: '192.168.0.194',
      port: 5250,
      enabled: true
    });

    const status = {
      1: {
        connected: server.isConnected()
      }
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting server status:', error);
    return NextResponse.json(
      { error: 'Failed to get server status' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
