import getDb from '@/db';
import { Project, CreateProjectInput, UpdateProjectInput } from '@/lib/types/project';

export const projectsRepo = {
  getAll: async (): Promise<Project[]> => {
    const db = await getDb();
    return db.all('SELECT * FROM projects ORDER BY created_at DESC');
  },

  getById: async (id: number): Promise<Project | undefined> => {
    const db = await getDb();
    return db.get('SELECT * FROM projects WHERE id = ?', id);
  },

  create: async (input: CreateProjectInput): Promise<Project> => {
    const db = await getDb();
    const { lastID } = await db.run(
      'INSERT INTO projects (name, description) VALUES (?, ?)',
      [input.name, input.description]
    );
    
    return projectsRepo.getById(lastID);
  },

  update: async (input: UpdateProjectInput): Promise<Project> => {
    const db = await getDb();
    await db.run(
      `UPDATE projects 
       SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [input.name, input.description, input.id]
    );

    return projectsRepo.getById(input.id);
  },

  delete: async (id: number): Promise<void> => {
    const db = await getDb();
    await db.run('DELETE FROM projects WHERE id = ?', [id]);
  }
};