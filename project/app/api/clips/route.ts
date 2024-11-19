import { NextResponse } from 'next/server';
import getDb from '@/db';
import { z } from 'zod';
import ProjectItemInitializer from '@/server/services/ProjectItemInitializer';

const createClipSchema = z.object({
  event_id: z.number(),
  position_row: z.number(),
  position_column: z.number(),
  name: z.string(),
  file_path: z.string(),
  channel: z.number().optional(),
  layer: z.number().optional(),
  loop: z.boolean().optional(),
  transition_type: z.string().optional(),
  transition_duration: z.number().optional(),
  auto_start: z.boolean().optional()
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = createClipSchema.parse(body);
    
    const db = await getDb();

    // Iniciar una transacción
    await db.run('BEGIN TRANSACTION');

    try {
      // Crear el item base
      const itemResult = await db.run(`
        INSERT INTO mitems (event_id, type, position_row, position_column)
        VALUES (?, 'CasparClip', ?, ?)
      `, [validatedData.event_id, validatedData.position_row, validatedData.position_column]);

      const itemId = itemResult.lastID;

      // Crear el clip específico
      await db.run(`
        INSERT INTO caspar_clips (
          item_id, name, file_path, channel, layer, loop,
          transition_type, transition_duration, auto_start
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        itemId,
        validatedData.name,
        validatedData.file_path,
        validatedData.channel || 1,
        validatedData.layer || 1,
        validatedData.loop || false,
        validatedData.transition_type || 'cut',
        validatedData.transition_duration || 0,
        validatedData.auto_start || false
      ]);

      // Confirmar la transacción
      await db.run('COMMIT');

      // Crear el objeto del clip completo
      const clipData = {
        id: itemId,
        type: 'CasparClip',
        position_row: validatedData.position_row,
        position_column: validatedData.position_column,
        name: validatedData.name,
        file_path: validatedData.file_path,
        channel: validatedData.channel || 1,
        layer: validatedData.layer || 1,
        loop: validatedData.loop || false,
        transition_type: validatedData.transition_type || 'cut',
        transition_duration: validatedData.transition_duration || 0,
        auto_start: validatedData.auto_start || false
      };

      // Inicializar el clip en el backend
      ProjectItemInitializer.initializeItems([clipData]);

      return NextResponse.json(clipData, { status: 201 });
    } catch (error) {
      // Si algo sale mal, revertir la transacción
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid clip data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating clip:', error);
    return NextResponse.json(
      { error: 'Failed to create clip' },
      { status: 500 }
    );
  }
}
