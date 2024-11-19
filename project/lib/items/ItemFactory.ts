import { MItem, SpecificItemType, GridPosition, CasparClip } from '../types/item';
import { CasparClipRepository } from '../repositories/CasparClipRepository';
import { Database } from 'sqlite';
import { Logger } from '../utils/logger';

export class ItemFactory {
  private static instance: ItemFactory;
  private logger: Logger;
  private casparClipRepository: CasparClipRepository;

  private constructor(db: Database) {
    this.logger = new Logger('ItemFactory');
    this.casparClipRepository = new CasparClipRepository(db);
  }

  public static getInstance(db: Database): ItemFactory {
    if (!ItemFactory.instance) {
      ItemFactory.instance = new ItemFactory(db);
    }
    return ItemFactory.instance;
  }

  public async createItem(
    type: SpecificItemType,
    config: Record<string, any>,
    position: GridPosition
  ): Promise<MItem> {
    this.logger.debug('Creating item of type:', type);

    switch (type) {
      case 'casparClip':
        const clipData: Omit<CasparClip, 'id'> = {
          type: 'casparClip',
          eventId: config.eventId,
          name: config.name,
          filePath: config.filePath,
          channel: config.channel,
          layer: config.layer,
          loop: config.loop || false,
          autoStart: config.autoStart || false,
          position,
          transition: config.transition
        };
        return await this.casparClipRepository.create(clipData);
      
      // Add other item type implementations here
      default:
        throw new Error(`Unsupported item type: ${type}`);
    }
  }

  public async getItem(type: SpecificItemType, id: number): Promise<MItem | null> {
    switch (type) {
      case 'casparClip':
        return await this.casparClipRepository.findById(id);
      default:
        throw new Error(`Unsupported item type: ${type}`);
    }
  }

  public async updateItem(
    type: SpecificItemType,
    id: number,
    updates: Partial<MItem>
  ): Promise<MItem> {
    switch (type) {
      case 'casparClip':
        return await this.casparClipRepository.update(id, updates as Partial<CasparClip>);
      default:
        throw new Error(`Unsupported item type: ${type}`);
    }
  }

  public async deleteItem(type: SpecificItemType, id: number): Promise<void> {
    switch (type) {
      case 'casparClip':
        await this.casparClipRepository.delete(id);
        break;
      default:
        throw new Error(`Unsupported item type: ${type}`);
    }
  }
}
