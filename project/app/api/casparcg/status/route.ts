import { NextResponse } from 'next/server';
import { CasparServer } from '@/server/device/caspar/CasparServer';
import { LoggerService } from '@/server/services/LoggerService';
import { CasparServerRepository } from '@/server/repositories/CasparServerRepository';

const logger = LoggerService.create('CasparStatusRoute');

export async function GET() {
  try {
    logger.debug('Getting CasparCG server status');
    
    const serverRepo = new CasparServerRepository();
    const servers = await serverRepo.getAll();
    
    if (servers.length === 0) {
      logger.warn('No CasparCG servers found in database');
      return NextResponse.json({ message: 'No servers configured' }, { status: 404 });
    }

    const status: Record<number, { connected: boolean }> = {};
    
    for (const serverConfig of servers) {
      const server = await CasparServer.getInstance(serverConfig);
      status[serverConfig.id] = {
        connected: server.isConnected()
      };
      logger.debug(`Server ${serverConfig.id} connection status: ${server.isConnected()}`);
    }

    return NextResponse.json(status);
  } catch (error) {
    logger.error('Error getting CasparCG server status', { error });
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
