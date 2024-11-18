"use server";

import getDb from '@/db';

export async function updateEventUnion(eventId: number, unionId: number) {
  try {
    const db = await getDb();
    
    await db.run(
      'UPDATE mevents SET event_union_id = ? WHERE id = ?',
      [unionId, eventId]
    );

    // Get updated event with new union
    const event = await db.get(`
      SELECT 
        e.*,
        u.name as union_name,
        u.icon as union_icon,
        u.description as union_description
      FROM mevents e
      LEFT JOIN mevent_unions u ON e.event_union_id = u.id
      WHERE e.id = ?
    `, eventId);

    return {
      success: true,
      event: {
        ...event,
        munion: event.union_name ? {
          id: event.event_union_id,
          name: event.union_name,
          icon: event.union_icon,
          description: event.union_description
        } : null
      }
    };
  } catch (error) {
    console.error('Error updating event union:', error);
    return { success: false, error: 'Failed to update event union' };
  }
}