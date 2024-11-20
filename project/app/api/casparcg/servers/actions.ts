'use server'

import { CasparServerRepository } from '@/app/api/repositories/caspar-server.repository';
import { DeviceConfig } from '@/lib/types/device';
import { LoggerService } from '@/lib/services/logger.service';

const logger = LoggerService.create('ServerActions');
const repository = CasparServerRepository.getInstance();

export async function getServers(): Promise<DeviceConfig[]> {
    logger.debug('Getting all servers');
    return await repository.findAll();
}

export async function updateServer(server: DeviceConfig): Promise<void> {
    logger.debug('Updating server', { serverId: server.id });
    await repository.update(server);
}

export async function deleteServer(id: string): Promise<void> {
    logger.debug('Deleting server', { serverId: id });
    await repository.delete(id);
}

export async function createServer(server: DeviceConfig): Promise<void> {
    logger.debug('Creating server');
    await repository.create(server);
}

export async function getServerState(id: string) {
    logger.debug('Getting server state', { serverId: id });
    const server = await repository.findById(Number(id));
    if (!server) {
        throw new Error('Server not found');
    }
    return server;
}
