import { NextResponse } from 'next/server';
import { z } from 'zod';
import { LoggerService } from '@/lib/services/logger.service';
import { CasparClipRepository } from '../repositories/caspar-clip.repository';

const context = 'ClipsAPI';
const logger = LoggerService.create(context);

const createClipSchema = z.object({
  event_id: z.number(),
  title: z.string(),
  server_id: z.number(),
  clip_path: z.string(),
  in_point: z.number().optional(),
  out_point: z.number().optional(),
  duration: z.number().optional(),
  loop: z.boolean().optional(),
  item_union_id: z.number().optional()
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    logger.debug('Received create clip request', { body });

    const validatedData = createClipSchema.parse(body);
    
    const clipRepo = CasparClipRepository.getInstance();
    const clip = await clipRepo.create(validatedData);

    logger.info('Clip created successfully', { clipId: clip.id });
    return NextResponse.json(clip);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid clip creation data', { error: error.errors });
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Failed to create clip', error);
    return NextResponse.json(
      { error: 'Failed to create clip' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');

    if (!eventId) {
      logger.warn('Missing event_id parameter');
      return NextResponse.json(
        { error: 'event_id is required' },
        { status: 400 }
      );
    }

    const clipRepo = CasparClipRepository.getInstance();
    const clips = await clipRepo.findByEventId(Number(eventId));

    logger.debug('Clips fetched successfully', { eventId, count: clips.length });
    return NextResponse.json(clips);
  } catch (error) {
    logger.error('Failed to fetch clips', error);
    return NextResponse.json(
      { error: 'Failed to fetch clips' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    logger.debug('Received update clip request', { body });

    if (!body.id) {
      logger.warn('Missing clip id');
      return NextResponse.json(
        { error: 'Clip id is required' },
        { status: 400 }
      );
    }

    const clipRepo = CasparClipRepository.getInstance();
    const clip = await clipRepo.findById(body.id);

    if (!clip) {
      logger.warn('Clip not found', { clipId: body.id });
      return NextResponse.json(
        { error: 'Clip not found' },
        { status: 404 }
      );
    }

    if (body.clip_path) {
      await clipRepo.updateClipPath(body.id, body.clip_path);
    }
    if (body.in_point !== undefined) {
      await clipRepo.updateInPoint(body.id, body.in_point);
    }
    if (body.out_point !== undefined) {
      await clipRepo.updateOutPoint(body.id, body.out_point);
    }
    if (body.duration !== undefined) {
      await clipRepo.updateDuration(body.id, body.duration);
    }
    if (body.loop !== undefined) {
      await clipRepo.updateLoop(body.id, body.loop);
    }
    if (body.item_union_id !== undefined) {
      await clipRepo.updateUnion(body.id, body.item_union_id);
    }

    const updatedClip = await clipRepo.findById(body.id);
    logger.info('Clip updated successfully', { clipId: body.id });
    return NextResponse.json(updatedClip);
  } catch (error) {
    logger.error('Failed to update clip', error);
    return NextResponse.json(
      { error: 'Failed to update clip' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      logger.warn('Missing clip id');
      return NextResponse.json(
        { error: 'Clip id is required' },
        { status: 400 }
      );
    }

    const clipRepo = CasparClipRepository.getInstance();
    await clipRepo.delete(Number(id));

    logger.info('Clip deleted successfully', { clipId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete clip', error);
    return NextResponse.json(
      { error: 'Failed to delete clip' },
      { status: 500 }
    );
  }
}
