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

    // Get all items for this project's events
    const items = await db.all(`
      SELECT 
        ip.id as position_id,
        ip.event_id,
        ip.item_type,
        ip.item_id,
        ip.position_row,
        ip.position_column,
        CASE ip.item_type
          WHEN 'CasparClip' THEN json_object(
            'id', cc.id,
            'name', cc.name,
            'file_path', cc.file_path,
            'channel', cc.channel,
            'layer', cc.layer,
            'loop', cc.loop,
            'auto_start', cc.auto_start,
            'transition_type', cc.transition_type,
            'transition_duration', cc.transition_duration
          )
          WHEN 'casparCamera' THEN json_object(
            'id', cam.id,
            'name', cam.name,
            'device_id', cam.device_id,
            'channel', cam.channel,
            'layer', cam.layer,
            'preview_enabled', cam.preview_enabled
          )
          WHEN 'casparGraphic' THEN json_object(
            'id', cg.id,
            'name', cg.name,
            'file_path', cg.file_path,
            'channel', cg.channel,
            'layer', cg.layer,
            'template_data', cg.template_data
          )
          WHEN 'casparMicrophone' THEN json_object(
            'id', cm.id,
            'name', cm.name,
            'device_id', cm.device_id,
            'channel', cm.channel,
            'layer', cm.layer,
            'volume', cm.volume
          )
          ELSE NULL
        END as item_data
      FROM item_positions ip
      LEFT JOIN caspar_clips cc ON ip.item_type = 'CasparClip' AND ip.item_id = cc.id
      LEFT JOIN caspar_cameras cam ON ip.item_type = 'casparCamera' AND ip.item_id = cam.id
      LEFT JOIN caspar_graphics cg ON ip.item_type = 'casparGraphic' AND ip.item_id = cg.id
      LEFT JOIN caspar_microphones cm ON ip.item_type = 'casparMicrophone' AND ip.item_id = cm.id
      WHERE ip.event_id IN (SELECT id FROM mevents WHERE project_id = ?)
      ORDER BY ip.event_id, ip.position_row, ip.position_column
    `, params.id);

    // Transform items into their proper structure
    const transformedItems = items.map(item => ({
      id: item.position_id,
      eventId: item.event_id,
      type: item.item_type,
      ...JSON.parse(item.item_data || '{}'),
      position: {
        row: item.position_row,
        column: item.position_column
      }
    }));

    // Format events with their unions and items
    const formattedEvents = events.map((event: any) => {
      const eventItems = transformedItems.filter((item: any) => item.eventId === event.id);

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
      events: formattedEvents,
      items: transformedItems
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}