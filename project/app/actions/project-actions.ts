'use server';

import { Project } from '@/lib/types/project';
import { MEvent } from '@/lib/types/event';
import { ProjectItemInitializer } from '@/server/services/ProjectItemInitializer';
import Logger from '@/lib/utils/logger';

export async function initializeProjectItems(items: any[]) {
    try {
        Logger.getInstance().info('ProjectActions', 'Initialize', `Initializing ${items.length} items`);
        
        const initializer = await ProjectItemInitializer.getInstance();
        const initializedItems = await initializer.initializeItems(items);

        Logger.getInstance().info('ProjectActions', 'Initialize', `Successfully initialized ${initializedItems.length} items`);
        
        return { success: true, initializedCount: initializedItems.length };
    } catch (error) {
        Logger.getInstance().error('ProjectActions', 'Initialize', 'Error initializing items:', error);
        throw new Error(`Failed to initialize items: ${error.message}`);
    }
}

export async function updateProject(project: Project) {
    try {
        // Inicializar items si es necesario
        if (project.events?.length) {
            const allItems = project.events.flatMap((event: MEvent) => event.items);
            await initializeProjectItems(allItems);
        }

        // Aquí iría la lógica de actualización del proyecto
        // ...

        return { success: true, project };
    } catch (error) {
        Logger.getInstance().error('ProjectActions', 'UpdateProject', 'Error updating project:', error);
        throw new Error(`Failed to update project: ${error.message}`);
    }
}

export async function getProjects(): Promise<Project[]> {
    try {
        Logger.getInstance().info('ProjectActions', 'GetProjects', 'Fetching all projects');
        const projects = await ProjectItemInitializer.getInstance().getProjects();
        return projects;
    } catch (error) {
        Logger.getInstance().error('ProjectActions', 'GetProjects', 'Error fetching projects:', error);
        throw new Error(`Failed to fetch projects: ${error.message}`);
    }
}
