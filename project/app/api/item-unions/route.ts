import { NextResponse } from 'next/server';
import getDb from '@/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const db = await getDb();
    const unions = await db.all(
      'SELECT * FROM mitem_unions WHERE compatible_items LIKE ? ORDER BY id',
      [`%${type}%`]
    );
    
    return NextResponse.json(unions);
  } catch (error) {
    console.error('Error fetching item unions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch item unions' },
      { status: 500 }
    );
  }
}