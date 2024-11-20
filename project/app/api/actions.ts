'use server'

import { DatabaseService } from '@/server/services/database.service';
import { CasparServerRepository } from './repositories/caspar-server.repository';
import { ItemUnionRepository } from './repositories/item-union.repository';
import { ServerManager } from '@/lib/services/ServerManager';
import { DeviceConfig } from '@/lib/types/device';
import { Project } from '@/lib/types/project';
import { LoggerService } from '@/lib/services/logger.service';

const logger = LoggerService.create('ServerActions');
const db = DatabaseService.getInstance();
const serverRepo = new CasparServerRepository(db);
const itemRepo = new ItemUnionRepository(db);
const serverManager = ServerManager.getInstance();

// Server actions
export async function getServers(): Promise<DeviceConfig[]> {
    logger.debug('Getting all servers');
    return await serverRepo.findAll();
}

export async function updateServer(server: DeviceConfig): Promise<void> {
    logger.debug('Updating server', { serverId: server.id });
    await serverRepo.update(server);
    
    if (server.connected) {
        await serverManager.connectServer(server.id.toString());
    } else {
        await serverManager.disconnectServer(server.id.toString());
    }
}

export async function deleteServer(id: string): Promise<void> {
    logger.debug('Deleting server', { serverId: id });
    await serverRepo.delete(id);
}

export async function createServer(server: DeviceConfig): Promise<void> {
    logger.debug('Creating server');
    await serverRepo.create(server);
}

export async function getServerState(id: string) {
    logger.debug('Getting server state', { serverId: id });
    const server = await serverRepo.findById(Number(id));
    if (!server) {
        throw new Error('Server not found');
    }
    return server;
}

// Project actions
export async function getProjects(): Promise<Project[]> {
    logger.debug('Getting all projects');
    return await itemRepo.findAll();
}

export async function getProject(id: string): Promise<Project | null> {
    logger.debug('Getting project', { projectId: id });
    return await itemRepo.findById(id);
}

export async function saveProject(project: Project): Promise<void> {
    logger.debug('Saving project', { projectId: project.id });
    await itemRepo.save(project);
}

// Server initialization
export async function initializeServer() {
    logger.debug('Initializing server');
    const [servers, currentProject] = await Promise.all([
        getServers(),
        getProject('default')
    ]);

    return {
        servers,
        currentProject,
        appVersion: process.env.APP_VERSION || '0.0.1'
    };
}
