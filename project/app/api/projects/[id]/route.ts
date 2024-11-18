import { NextResponse } from 'next/server';
import getDb from '@/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDb();
    
    // Get project details
    const project = await db.get('SELECT * FROM projects WHERE id = ?', params.id);
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get project events with their unions
    const events = await db.all(`
      SELECT 
        e.*,
        u.name as union_name,
        u.icon as union_icon,
        u.description as union_description
      FROM mevents e
      LEFT JOIN mevent_unions u ON e.event_union_id = u.id
      WHERE e.project_id = ?
      ORDER BY e.event_order
    `, params.id);

    // Get all MItems for this project's events
    const items = await db.all(`
      SELECT 
        i.*,
        u.name as union_name,
        u.icon as union_icon,
        u.description as union_description,
        u.position as union_position,
        u.delay as union_delay,
        c.name as clip_name,
        c.file_path,
        c.channel,
        c.layer,
        c.loop,
        c.transition_type,
        c.transition_duration,
        c.auto_start
      FROM mitems i
      LEFT JOIN mitem_unions u ON i.mitem_union_id = u.id
      LEFT JOIN caspar_clips c ON i.id = c.item_id
      WHERE i.event_id IN (
        SELECT id FROM mevents WHERE project_id = ?
      )
      ORDER BY i.position_row, i.position_column
    `, params.id);

    // Format events with their unions and items
    const formattedEvents = events.map((event: any) => {
      const eventItems = items.filter((item: any) => item.event_id === event.id)
        .map((item: any) => ({
          id: item.id,
          type: item.type,
          position_row: item.position_row,
          position_column: item.position_column,
          munion: item.union_name ? {
            id: item.mitem_union_id,
            name: item.union_name,
            icon: item.union_icon,
            description: item.union_description,
            position: item.union_position,
            delay: item.union_delay
          } : null,
          // If it's a CasparMClip, add clip-specific properties
          ...(item.type === 'casparMClip' && {
            name: item.clip_name,
            file_path: item.file_path,
            channel: item.channel,
            layer: item.layer,
            loop: item.loop,
            transition_type: item.transition_type,
            transition_duration: item.transition_duration,
            auto_start: item.auto_start
          })
        }));

      return {
        id: event.id,
        project_id: event.project_id,
        title: event.title,
        event_order: event.event_order,
        event_union_id: event.event_union_id,
        items: eventItems,
        munion: event.union_name ? {
          id: event.event_union_id,
          name: event.union_name,
          icon: event.union_icon,
          description: event.union_description
        } : null
      };
    });

    // Return project with its events and items
    return NextResponse.json({
      ...project,
      events: formattedEvents
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}