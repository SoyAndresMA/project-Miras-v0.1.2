import { NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { DeviceConfig } from '@/lib/types/device';
import { LoggerService } from '@/lib/services/logger.service';

const logger = LoggerService.create('ServersAPI');

// GET /api/servers
export async function GET() {
    try {
        const servers = await query<DeviceConfig[]>(
            'SELECT * FROM servers WHERE deleted_at IS NULL'
        );
        return NextResponse.json(servers);
    } catch (error) {
        logger.error('Error getting servers:', error);
        return NextResponse.json({ error: 'Failed to get servers' }, { status: 500 });
    }
}

// POST /api/servers
export async function POST(request: Request) {
    try {
        const server = await request.json();
        await execute(
            'INSERT INTO servers (name, host, port, type) VALUES (?, ?, ?, ?)',
            [server.name, server.host, server.port, server.type]
        );
        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Error creating server:', error);
        return NextResponse.json({ error: 'Failed to create server' }, { status: 500 });
    }
}

// PUT /api/servers
export async function PUT(request: Request) {
    try {
        const server = await request.json();
        await execute(
            'UPDATE servers SET name = ?, host = ?, port = ?, type = ?, connected = ? WHERE id = ?',
            [server.name, server.host, server.port, server.type, server.connected, server.id]
        );
        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Error updating server:', error);
        return NextResponse.json({ error: 'Failed to update server' }, { status: 500 });
    }
}

// DELETE /api/servers/[id]
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        await execute(
            'UPDATE servers SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
            [params.id]
        );
        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Error deleting server:', error);
        return NextResponse.json({ error: 'Failed to delete server' }, { status: 500 });
    }
}
