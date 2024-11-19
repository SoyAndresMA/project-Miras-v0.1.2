import { NextResponse } from 'next/server';
import { ProjectRepository } from '../repositories/project.repository';

export async function GET() {
  try {
    const projectRepo = ProjectRepository.getInstance();
    const projects = await projectRepo.findAll();
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const projectRepo = ProjectRepository.getInstance();
    const input = await request.json();
    const project = await projectRepo.create(input);
    return NextResponse.json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}