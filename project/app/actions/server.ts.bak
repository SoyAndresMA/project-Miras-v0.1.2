'use server'

import { DatabaseService } from '@/server/services/database.service';
import { CasparServerRepository } from '@/app/api/repositories/caspar-server.repository';
import { ItemUnionRepository } from '@/app/api/repositories/item-union.repository';
import { ServerManager } from '@/lib/services/ServerManager';
import { DeviceConfig } from '@/lib/types/device';
import { Project } from '@/lib/types/project';
import { LoggerService } from '@/lib/services/logger.service';

const logger = LoggerService.create('ServerActions');

// Server state actions
export async function getServers(): Promise<DeviceConfig[]> {
    const repo = new CasparServerRepository();
    return await repo.findAll();
}

export async function updateServer(server: DeviceConfig): Promise<void> {
    const repo = new CasparServerRepository();
    await repo.update(server);
    
    // Manage server connection
    const serverManager = ServerManager.getInstance();
    if (server.connected) {
        await serverManager.connectServer(server.id.toString());
    } else {
        await serverManager.disconnectServer(server.id.toString());
    }
}

export async function deleteServer(id: string): Promise<void> {
    const repo = new CasparServerRepository();
    await repo.delete(id);
}

export async function createServer(server: DeviceConfig): Promise<void> {
    const repo = new CasparServerRepository();
    await repo.create(server);
}

// Project actions
export async function getProjects(): Promise<Project[]> {
    const repo = new ItemUnionRepository();
    return await repo.findAll();
}

export async function getProject(id: string): Promise<Project | null> {
    const repo = new ItemUnionRepository();
    return await repo.findById(id);
}

export async function saveProject(project: Project): Promise<void> {
    const repo = new ItemUnionRepository();
    await repo.update(project);
    logger.info('Project saved successfully', { projectId: project.id });
}

// Server initialization
export async function initializeServer(): Promise<{
    servers: DeviceConfig[];
    currentProject: Project | null;
    appVersion: string;
}> {
    const serverRepo = new CasparServerRepository();
    const projectRepo = new ItemUnionRepository();
    
    try {
        const servers = await serverRepo.findAll();
        const currentProject = servers.length > 0 ? await projectRepo.findById(servers[0].id) : null;
        
        return {
            servers,
            currentProject,
            appVersion: process.env.APP_VERSION || '1.0.0'
        };
    } catch (error) {
        logger.error('Failed to initialize server', error as Error);
        throw error;
    }
}
