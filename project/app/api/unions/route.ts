import { NextResponse } from 'next/server';
import getDb from '@/db';

export async function GET() {
  try {
    const db = await getDb();
    const unions = await db.all('SELECT * FROM mevent_unions ORDER BY id');
    return NextResponse.json(unions);
  } catch (error) {
    console.error('Error fetching unions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unions' },
      { status: 500 }
    );
  }
}