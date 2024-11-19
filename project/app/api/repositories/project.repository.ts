import { BaseRepository } from './base.repository';
import { Project, CreateProjectInput, UpdateProjectInput } from '@/lib/types/project';
import { LoggerService } from '@/lib/services/logger.service';

export class ProjectRepository extends BaseRepository {
  private static instance: ProjectRepository;
  private readonly logger = LoggerService.getInstance();
  private readonly context = 'ProjectRepository';

  private constructor() {
    super();
  }

  public static getInstance(): ProjectRepository {
    if (!this.instance) {
      this.instance = new ProjectRepository();
    }
    return this.instance;
  }

  async findAll(): Promise<Project[]> {
    this.logger.debug('Fetching all projects', this.context);
    return this.dbService.query<Project[]>(
      'SELECT * FROM projects ORDER BY created_at DESC',
      undefined,
      { cache: true, context: this.context }
    );
  }

  async findById(id: number): Promise<Project | null> {
    this.logger.debug('Fetching project by ID', this.context, { id });
    const projects = await this.dbService.query<Project[]>(
      'SELECT * FROM projects WHERE id = ?',
      [id],
      { cache: true, context: this.context }
    );
    return projects[0] || null;
  }

  async create(input: CreateProjectInput): Promise<Project> {
    this.logger.info('Creating new project', this.context, { input });
    
    return this.dbService.transaction(async (db) => {
      const { lastID } = await db.run(
        'INSERT INTO projects (name, description) VALUES (?, ?)',
        [input.name, input.description]
      );
      
      const project = await this.findById(lastID);
      if (!project) {
        const error = new Error('Failed to create project');
        this.logger.error('Project creation failed', error, this.context, { input });
        throw error;
      }
      
      this.logger.info('Project created successfully', this.context, { id: lastID });
      return project;
    }, this.context);
  }

  async update(input: UpdateProjectInput): Promise<Project> {
    this.logger.info('Updating project', this.context, { input });
    
    return this.dbService.transaction(async (db) => {
      await db.run(
        `UPDATE projects 
         SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [input.name, input.description, input.id]
      );

      const project = await this.findById(input.id);
      if (!project) {
        const error = new Error('Project not found after update');
        this.logger.error('Project update failed', error, this.context, { input });
        throw error;
      }
      
      this.logger.info('Project updated successfully', this.context, { id: input.id });
      return project;
    }, this.context);
  }

  async delete(id: number): Promise<void> {
    this.logger.info('Deleting project', this.context, { id });
    
    await this.dbService.transaction(async (db) => {
      // Verificar si el proyecto existe
      const project = await this.findById(id);
      if (!project) {
        const error = new Error('Project not found');
        this.logger.error('Project deletion failed', error, this.context, { id });
        throw error;
      }

      // Eliminar el proyecto y sus dependencias
      await db.run('DELETE FROM projects WHERE id = ?', [id]);
      
      this.logger.info('Project deleted successfully', this.context, { id });
    }, this.context);
  }
}
