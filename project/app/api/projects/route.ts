import { NextResponse } from 'next/server';
import getDb from '@/db';

export async function GET() {
  try {
    const db = await getDb();
    const projects = await db.all('SELECT * FROM projects ORDER BY created_at DESC');
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}