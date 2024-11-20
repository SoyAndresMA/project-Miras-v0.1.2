import { CasparClip } from '@/server/items/CasparClip';
import { MItemType } from '@/lib/types/item';
import Logger from '@/lib/utils/logger';
import { CasparServer } from '@/server/device/caspar/CasparServer';
import { CasparClipRepository } from '@/lib/repositories/CasparClipRepository';
import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';

interface ProjectItem {
  id: number;
  event_id: number;
  type: MItemType;
  position_row: number;
  position_column: number;
  name?: string;
  file_path?: string;
  channel?: number;
  layer?: number;
  loop?: boolean;
  transition_type?: string;
  transition_duration?: number;
  auto_start?: boolean;
}

class ProjectItemInitializer {
  private static instance: ProjectItemInitializer;
  private clips: Map<number, CasparClip> = new Map();
  private server: CasparServer | null = null;
  private repository: CasparClipRepository | null = null;
  private db: Database | null = null;

  private constructor() {}

  private async initialize() {
    // Inicializar base de datos
    this.db = await open({
      filename: path.join(process.cwd(), 'db/database.sqlite'),
      driver: sqlite3.Database
    });

    // Inicializar repositorio
    this.repository = new CasparClipRepository(this.db);
  }

  public static async getInstance(): Promise<ProjectItemInitializer> {
    if (!ProjectItemInitializer.instance) {
      ProjectItemInitializer.instance = new ProjectItemInitializer();
      await ProjectItemInitializer.instance.initialize();
    }
    return ProjectItemInitializer.instance;
  }

  public async initializeItems(items: ProjectItem[]) {
    // Solo mostrar warning si hay clips de CasparCG
    const hasCasparClips = items.some(item => item.type === 'casparClip');
    
    if (hasCasparClips) {
      Logger.getInstance().info('ProjectItemInitializer', 'Initialize', 'Initializing CasparCG clips');
      
      // Obtener el servidor CasparCG
      try {
        this.server = await CasparServer.getInstance(1);
        Logger.getInstance().info('ProjectItemInitializer', 'Initialize', 'CasparCG server instance obtained', {
          serverId: 1,
          isConnected: this.server.isConnected()
        });
      } catch (error) {
        Logger.getInstance().error('ProjectItemInitializer', 'Initialize', 'Failed to get CasparCG server', error);
      }
    }

    const initializedClips = [];

    for (const item of items) {
      if (item.type === 'casparClip' && item.file_path) {
        try {
          Logger.getInstance().info('ProjectItemInitializer', 'Initialize', `Initializing clip ${item.name}`, {
            clipId: item.id,
            filePath: item.file_path,
            channel: item.channel,
            layer: item.layer
          });

          const clip = new CasparClip(
            {
              id: item.id,
              eventId: item.event_id,
              name: item.name || '',
              file_path: item.file_path,
              position_row: item.position_row,
              position_column: item.position_column,
              channel: item.channel || 1,
              layer: item.layer || 10,
              loop: item.loop || false,
              transition_type: item.transition_type || 'cut',
              transition_duration: item.transition_duration || 0,
              auto_start: item.auto_start || false
            },
            this.server!,
            this.repository!
          );

          // Almacenar el clip en el mapa
          this.clips.set(item.id, clip);
          initializedClips.push(clip);
          
          Logger.getInstance().info('ProjectItemInitializer', 'Initialize', 
            `Successfully initialized clip ${item.name || 'Unnamed'} with ID ${item.id}`);

        } catch (error) {
          Logger.getInstance().error('ProjectItemInitializer', 'Initialize', 
            `Failed to initialize clip ${item.name || 'Unnamed'}: ${error instanceof Error ? error.message : 'Unknown error'}`, 
            error);
        }
      }
    }

    return initializedClips;
  }

  public getClip(id: number): CasparClip | undefined {
    return this.clips.get(id);
  }

  public async getProjects(): Promise<any[]> {
    if (!this.db) {
      await this.initialize();
    }
    try {
      const projects = await this.db.all('SELECT * FROM projects ORDER BY created_at DESC');
      return projects;
    } catch (error) {
      Logger.getInstance().error('ProjectItemInitializer', 'getProjects', 'Error fetching projects:', error);
      throw error;
    }
  }
}

export { ProjectItemInitializer };
export default ProjectItemInitializer;
