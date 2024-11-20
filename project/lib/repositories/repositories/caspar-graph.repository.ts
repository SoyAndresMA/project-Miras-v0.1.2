import { ItemRepository } from './item.repository';
import { MCasparGraph, CreateMCasparGraphInput } from '@/lib/types/caspar-graph';

export class CasparGraphRepository extends ItemRepository<MCasparGraph, CreateMCasparGraphInput> {
  private static instance: CasparGraphRepository;
  protected readonly context = 'CasparGraphRepository';
  protected readonly tableName = 'mcaspar_graphs';

  private constructor() {
    super();
  }

  public static getInstance(): CasparGraphRepository {
    if (!this.instance) {
      this.instance = new CasparGraphRepository();
    }
    return this.instance;
  }

  protected async performCreate(db: any, input: CreateMCasparGraphInput & { item_order: number }): Promise<{ lastID: number }> {
    return db.run(
      `INSERT INTO ${this.tableName} (
        event_id, 
        title, 
        item_order, 
        item_union_id,
        server_id,
        template_path,
        template_data,
        duration
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.event_id,
        input.title,
        input.item_order,
        input.item_union_id,
        input.server_id,
        input.template_path,
        JSON.stringify(input.template_data || {}),
        input.duration || 0
      ]
    );
  }

  async updateTemplatePath(id: number, templatePath: string): Promise<void> {
    this.logger.info('Updating template path', this.context, { id, templatePath });
    
    await this.dbService.transaction(async (db) => {
      const graph = await this.findById(id);
      if (!graph) {
        const error = new Error('Graph not found');
        this.logger.error('Template path update failed', error, this.context, { id, templatePath });
        throw error;
      }

      await db.run(
        `UPDATE ${this.tableName} SET template_path = ? WHERE id = ?`,
        [templatePath, id]
      );

      this.logger.info('Template path updated successfully', this.context, { id });
    }, this.context);
  }

  async updateTemplateData(id: number, templateData: Record<string, any>): Promise<void> {
    this.logger.info('Updating template data', this.context, { id, templateData });
    
    await this.dbService.transaction(async (db) => {
      const graph = await this.findById(id);
      if (!graph) {
        const error = new Error('Graph not found');
        this.logger.error('Template data update failed', error, this.context, { id, templateData });
        throw error;
      }

      await db.run(
        `UPDATE ${this.tableName} SET template_data = ? WHERE id = ?`,
        [JSON.stringify(templateData), id]
      );

      this.logger.info('Template data updated successfully', this.context, { id });
    }, this.context);
  }

  async updateDuration(id: number, duration: number): Promise<void> {
    this.logger.info('Updating duration', this.context, { id, duration });
    
    await this.dbService.transaction(async (db) => {
      const graph = await this.findById(id);
      if (!graph) {
        const error = new Error('Graph not found');
        this.logger.error('Duration update failed', error, this.context, { id, duration });
        throw error;
      }

      await db.run(
        `UPDATE ${this.tableName} SET duration = ? WHERE id = ?`,
        [duration, id]
      );

      this.logger.info('Duration updated successfully', this.context, { id });
    }, this.context);
  }

  // Método auxiliar para obtener datos de template parseados
  async getTemplateData(id: number): Promise<Record<string, any>> {
    const graph = await this.findById(id);
    if (!graph) {
      throw new Error('Graph not found');
    }
    try {
      return JSON.parse(graph.template_data);
    } catch (error) {
      this.logger.error('Failed to parse template data', error, this.context, { id });
      return {};
    }
  }
}
