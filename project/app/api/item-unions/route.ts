import { NextResponse } from 'next/server';
import { LoggerService } from '@/lib/services/logger.service';
import { ItemUnionRepository } from '../repositories/item-union.repository';
import { z } from 'zod';

const logger = LoggerService.getInstance();
const context = 'ItemUnionsAPI';

const createUnionSchema = z.object({
  name: z.string(),
  compatible_items: z.array(z.string()),
  description: z.string().optional()
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const unionRepo = ItemUnionRepository.getInstance();
    const unions = type 
      ? await unionRepo.findByCompatibleType(type)
      : await unionRepo.findAll();

    logger.debug('Item unions fetched successfully', context, { 
      type, 
      count: unions.length 
    });
    return NextResponse.json(unions);
  } catch (error) {
    logger.error('Failed to fetch item unions', error, context);
    return NextResponse.json(
      { error: 'Failed to fetch item unions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    logger.debug('Received create union request', context, { body });

    const validatedData = createUnionSchema.parse(body);
    
    const unionRepo = ItemUnionRepository.getInstance();
    const union = await unionRepo.create({
      name: validatedData.name,
      compatible_items: validatedData.compatible_items.join(','),
      description: validatedData.description || ''
    });

    logger.info('Item union created successfully', context, { unionId: union.id });
    return NextResponse.json(union);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid union creation data', context, { error: error.errors });
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Failed to create item union', error, context);
    return NextResponse.json(
      { error: 'Failed to create item union' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    logger.debug('Received update union request', context, { body });

    if (!body.id) {
      logger.warn('Missing union id', context);
      return NextResponse.json(
        { error: 'Union id is required' },
        { status: 400 }
      );
    }

    const unionRepo = ItemUnionRepository.getInstance();
    const union = await unionRepo.findById(body.id);

    if (!union) {
      logger.warn('Union not found', context, { unionId: body.id });
      return NextResponse.json(
        { error: 'Union not found' },
        { status: 404 }
      );
    }

    const updatedUnion = await unionRepo.update(body.id, {
      name: body.name,
      compatible_items: Array.isArray(body.compatible_items) 
        ? body.compatible_items.join(',')
        : body.compatible_items,
      description: body.description
    });

    logger.info('Item union updated successfully', context, { unionId: body.id });
    return NextResponse.json(updatedUnion);
  } catch (error) {
    logger.error('Failed to update item union', error, context);
    return NextResponse.json(
      { error: 'Failed to update item union' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      logger.warn('Missing union id', context);
      return NextResponse.json(
        { error: 'Union id is required' },
        { status: 400 }
      );
    }

    const unionRepo = ItemUnionRepository.getInstance();
    await unionRepo.delete(Number(id));

    logger.info('Item union deleted successfully', context, { unionId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete item union', error, context);
    return NextResponse.json(
      { error: 'Failed to delete item union' },
      { status: 500 }
    );
  }
}