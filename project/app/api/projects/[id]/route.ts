import { NextResponse } from 'next/server';
import { ProjectRepository } from '../../repositories/project.repository';
import { EventRepository } from '../../repositories/event.repository';
import { ItemUnionRepository } from '../../repositories/item-union.repository';
import { CasparClipRepository } from '../../repositories/caspar-clip.repository';
import { CasparMicRepository } from '../../repositories/caspar-mic.repository';
import { CasparGraphRepository } from '../../repositories/caspar-graph.repository';
import { LoggerService } from '@/lib/services/logger.service';

const context = 'ProjectAPI';
const logger = LoggerService.create(context);

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectRepo = ProjectRepository.getInstance();
    const eventRepo = EventRepository.getInstance();
    const unionRepo = ItemUnionRepository.getInstance();
    const clipRepo = CasparClipRepository.getInstance();
    const micRepo = CasparMicRepository.getInstance();
    const graphRepo = CasparGraphRepository.getInstance();

    logger.debug('Fetching project details', { projectId: params.id });
    
    // Get project details
    const project = await projectRepo.findById(parseInt(params.id));
    
    if (!project) {
      logger.warn('Project not found', { projectId: params.id });
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get project events with their unions
    const events = await eventRepo.findByProjectId(parseInt(params.id));
    const eventIds = events.map(e => e.id);

    // Get unions for all events
    const unions = await unionRepo.findByEventIds(eventIds);
    const unionsMap = new Map(unions.map(u => [u.id, u]));

    // Get all items for this project's events using specific repositories
    const [clips, mics, graphics] = await Promise.all([
      clipRepo.findByEventIds(eventIds),
      micRepo.findByEventIds(eventIds),
      graphRepo.findByEventIds(eventIds)
    ]);

    // Create a map of all items with their positions
    const itemsMap = new Map();
    
    // Add clips
    for (const clip of clips) {
      const position = await clipRepo.getPosition(clip.id);
      if (position) {
        itemsMap.set(`CasparClip-${clip.id}`, {
          id: clip.id,
          eventId: clip.event_id,
          type: 'CasparClip',
          ...clip,
          position
        });
      }
    }

    // Add mics
    for (const mic of mics) {
      const position = await micRepo.getPosition(mic.id);
      if (position) {
        itemsMap.set(`casparMicrophone-${mic.id}`, {
          id: mic.id,
          eventId: mic.event_id,
          type: 'casparMicrophone',
          ...mic,
          position
        });
      }
    }

    // Add graphics
    for (const graphic of graphics) {
      const position = await graphRepo.getPosition(graphic.id);
      if (position) {
        itemsMap.set(`casparGraphic-${graphic.id}`, {
          id: graphic.id,
          eventId: graphic.event_id,
          type: 'casparGraphic',
          ...graphic,
          position
        });
      }
    }

    // Format events with their unions and items
    const formattedEvents = events.map(event => {
      const eventItems = Array.from(itemsMap.values())
        .filter(item => item.eventId === event.id);

      const union = unionsMap.get(event.event_union_id);

      return {
        id: event.id,
        project_id: event.project_id,
        title: event.title,
        event_order: event.event_order,
        event_union_id: event.event_union_id,
        items: eventItems,
        munion: union ? {
          id: union.id,
          name: union.name,
          icon: union.icon,
          description: union.description
        } : null
      };
    });

    logger.info('Project fetched successfully', { 
      projectId: params.id,
      eventCount: events.length,
      itemCount: itemsMap.size
    });

    // Return project with its events and items
    return NextResponse.json({
      ...project,
      events: formattedEvents,
      items: Array.from(itemsMap.values())
    });
  } catch (error) {
    logger.error('Failed to fetch project', error as Error, { projectId: params.id });
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectRepo = ProjectRepository.getInstance();
    const input = await request.json();
    const project = await projectRepo.update({ ...input, id: parseInt(params.id) });
    return NextResponse.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectRepo = ProjectRepository.getInstance();
    await projectRepo.delete(parseInt(params.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}