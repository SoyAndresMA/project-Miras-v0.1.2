import { NextResponse } from 'next/server';
import { DatabaseService } from '../../server/services/database.service';

export async function GET() {
  try {
    const dbService = DatabaseService.getInstance();
    const db = await dbService.getConnection();
    const unions = await db.all('SELECT * FROM mevent_unions ORDER BY id');
    return NextResponse.json(unions);
  } catch (error) {
    console.error('Error fetching event unions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event unions' },
      { status: 500 }
    );
  }
}
