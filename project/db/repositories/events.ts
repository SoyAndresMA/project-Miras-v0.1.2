import getDb from '@/db';
import { MEvent, CreateMEventInput } from '@/lib/types/event';

export const eventsRepo = {
  create: async (input: CreateMEventInput): Promise<MEvent> => {
    const db = await getDb();
    
    // Get the highest order for the project
    const { max_order } = await db.get(
      'SELECT MAX(event_order) as max_order FROM mevents WHERE project_id = ?',
      input.project_id
    );
    
    const newOrder = (max_order || 0) + 1;

    const { lastID } = await db.run(
      `INSERT INTO mevents (project_id, title, event_order, event_union_id) 
       VALUES (?, ?, ?, ?)`,
      [input.project_id, input.title, newOrder, input.event_union_id]
    );

    return db.get('SELECT * FROM mevents WHERE id = ?', lastID);
  },

  getByProjectId: async (projectId: number): Promise<MEvent[]> => {
    const db = await getDb();
    return db.all(
      'SELECT * FROM mevents WHERE project_id = ? ORDER BY event_order',
      projectId
    );
  },

  updateOrder: async (id: number, newOrder: number): Promise<void> => {
    const db = await getDb();
    await db.run(
      'UPDATE mevents SET event_order = ? WHERE id = ?',
      [newOrder, id]
    );
  }
};