import { NextResponse } from 'next/server';
import { LoggerService } from '@/lib/services/logger.service';
import { EventRepository } from '../repositories/event.repository';
import { z } from 'zod';

const logger = LoggerService.getInstance();
const context = 'EventsAPI';

const createEventSchema = z.object({
  project_id: z.number(),
  title: z.string().min(1).max(100),
  event_union_id: z.number().optional(),
  description: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional()
});

const updateEventSchema = createEventSchema.partial().extend({
  id: z.number()
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      logger.warn('Missing project_id parameter', context);
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    const eventRepo = EventRepository.getInstance();
    const events = await eventRepo.findByProjectId(Number(projectId));

    logger.debug('Events fetched successfully', context, { 
      projectId, 
      count: events.length 
    });
    return NextResponse.json(events);
  } catch (error) {
    logger.error('Failed to fetch events', error, context);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    logger.debug('Received create event request', context, { body });

    const validatedData = createEventSchema.parse(body);
    
    const eventRepo = EventRepository.getInstance();
    const event = await eventRepo.create(validatedData);

    logger.info('Event created successfully', context, { eventId: event.id });
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid event creation data', context, { error: error.errors });
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Failed to create event', error, context);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    logger.debug('Received update event request', context, { body });

    const validatedData = updateEventSchema.parse(body);
    
    const eventRepo = EventRepository.getInstance();
    const event = await eventRepo.findById(validatedData.id);

    if (!event) {
      logger.warn('Event not found', context, { eventId: validatedData.id });
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const updatedEvent = await eventRepo.update(validatedData.id, validatedData);

    logger.info('Event updated successfully', context, { eventId: validatedData.id });
    return NextResponse.json(updatedEvent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid event update data', context, { error: error.errors });
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Failed to update event', error, context);
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      logger.warn('Missing event id', context);
      return NextResponse.json(
        { error: 'Event id is required' },
        { status: 400 }
      );
    }

    const eventRepo = EventRepository.getInstance();
    const event = await eventRepo.findById(Number(id));

    if (!event) {
      logger.warn('Event not found', context, { eventId: id });
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    await eventRepo.delete(Number(id));

    logger.info('Event deleted successfully', context, { eventId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete event', error, context);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}