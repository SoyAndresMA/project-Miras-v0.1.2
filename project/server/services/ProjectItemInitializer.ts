import { CasparClip } from '@/server/items/CasparClip';
import { MItemType } from '@/lib/types/item';
import Logger from '@/lib/utils/logger';

interface ProjectItem {
  id: number;
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

  private constructor() {}

  public static async getInstance(): Promise<ProjectItemInitializer> {
    if (!ProjectItemInitializer.instance) {
      ProjectItemInitializer.instance = new ProjectItemInitializer();
    }
    return ProjectItemInitializer.instance;
  }

  public async initializeItems(items: ProjectItem[]) {
    // Solo mostrar warning si hay clips de CasparCG
    const hasCasparClips = items.some(item => item.type === 'casparClip');
    
    if (hasCasparClips) {
      Logger.info('ProjectItemInitializer', 'Initialize', 'Initializing CasparCG clips in offline mode');
    }

    items.forEach(item => {
      if (item.type === 'casparClip' && item.file_path) {
        try {
          const clip = new CasparClip({
            id: item.id,
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
          });

          // Almacenar el clip en el mapa
          this.clips.set(item.id, clip);
          Logger.info('ProjectItemInitializer', 'Initialize', `Successfully initialized clip ${item.name || 'Unnamed'} with ID ${item.id}`);

        } catch (error) {
          Logger.error('ProjectItemInitializer', 'Initialize', `Failed to initialize clip ${item.name || 'Unnamed'}: ${error.message}`, error);
        }
      }
    });

    return Array.from(this.clips.values());
  }

  public getClip(id: number): CasparClip | undefined {
    return this.clips.get(id);
  }
}

export { ProjectItemInitializer };
export default ProjectItemInitializer;
