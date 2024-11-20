'use server';

import { DatabaseService } from '@/server/services/database.service';
import { CasparServerRepository } from '@/lib/repositories/caspar-server.repository';
import { ServerManager } from '@/lib/services/ServerManager';
import { DeviceConfig } from '@/lib/types/device';
import { LoggerService } from '@/lib/services/logger.service';

const logger = LoggerService.create('ServerActions');
const db = DatabaseService.getInstance();
const serverRepo = new CasparServerRepository();
const serverManager = ServerManager.getInstance();

// Server State Management
export async function getServers(): Promise<DeviceConfig[]> {
    logger.debug('Getting all servers');
    return await serverRepo.findAll();
}

export async function getServerState(id: string) {
    logger.debug('Getting server state', { serverId: id });
    return await serverRepo.findById(Number(id));
}

export async function createServer(data: Omit<DeviceConfig, 'id'>): Promise<void> {
    logger.debug('Creating server');
    await serverRepo.create(data);
}

export async function updateServer(id: number, data: Partial<DeviceConfig>): Promise<void> {
    logger.debug('Updating server', { serverId: id });
    await serverRepo.update(id, data);
    
    // Manage server connection if connected status changes
    if (data.connected !== undefined) {
        if (data.connected) {
            await serverManager.connectServer(id.toString());
        } else {
            await serverManager.disconnectServer(id.toString());
        }
    }
}

export async function deleteServer(id: string): Promise<void> {
    logger.debug('Deleting server', { serverId: id });
    await serverRepo.delete(id);
}

// Server Initialization
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

// Server Connection Testing
export async function testServerConnection(serverId: string): Promise<boolean> {
    logger.debug('Testing server connection', { serverId });
    try {
        const server = await serverRepo.findById(Number(serverId));
        if (!server) {
            throw new Error('Server not found');
        }
        
        const isConnected = await serverManager.testConnection(serverId);
        return isConnected;
    } catch (error) {
        logger.error('Error testing server connection:', error);
        return false;
    }
}

// Project Management
export async function saveProject(project: Project): Promise<void> {
    logger.debug('Saving project', { projectId: project.id });
    await itemRepo.save(project);
}

export async function getProject(id: string): Promise<Project | null> {
    logger.debug('Getting project', { projectId: id });
    return await itemRepo.findById(id);
}
