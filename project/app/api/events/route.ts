import { NextResponse } from 'next/server';
import { eventsRepo } from '@/db/repositories/events';
import { z } from 'zod';

const createEventSchema = z.object({
  project_id: z.number(),
  title: z.string().min(1).max(100),
  event_union_id: z.number()
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = createEventSchema.parse(body);
    
    const event = eventsRepo.create(validatedData);
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid event data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}