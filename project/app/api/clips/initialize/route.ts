import { NextResponse } from 'next/server';
import { ProjectItemInitializer } from '@/server/services/ProjectItemInitializer';
import Logger from '@/lib/utils/logger';

export async function POST(request: Request) {
  try {
    const items = await request.json();
    
    Logger.info('API', 'Initialize', `Initializing ${items.length} clips`);
    
    // Inicializar los clips en el backend
    const initializer = await ProjectItemInitializer.getInstance();
    const initializedClips = await initializer.initializeItems(items);

    Logger.info('API', 'Initialize', `Successfully initialized ${initializedClips.length} clips`);

    return NextResponse.json({ 
      success: true,
      initializedCount: initializedClips.length
    });
  } catch (error) {
    Logger.error('API', 'Initialize', 'Error initializing clips:', error);
    return NextResponse.json(
      { 
        error: 'Failed to initialize clips',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
