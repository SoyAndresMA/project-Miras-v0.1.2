import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CasparServerRepository } from '@/app/api/repositories/caspar-server.repository';
import { LoggerService } from '@/lib/services/logger.service';

const context = 'CasparServersAPI';
const logger = LoggerService.create(context);

// Schema de validación para servidores CasparCG
const serverSchema = z.object({
  name: z.string().min(1, "Name is required"),
  host: z.string().min(1, "Host is required"),
  port: z.number().int().min(1024).max(65535),
  description: z.string().optional().nullable(),
  username: z.string().optional().nullable(),
  password: z.string().optional().nullable(),
  preview_channel: z.number().int().min(1).optional().nullable(),
  locked_channel: z.number().int().min(1).optional().nullable(),
  is_shadow: z.boolean().optional(),
  enabled: z.boolean().optional(),
  command_timeout: z.number().optional()
});

const repository = CasparServerRepository.getInstance();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const server = await repository.findById(Number(id));
      if (!server) {
        logger.warn('Server not found', { serverId: id });
        return NextResponse.json(
          { error: 'Server not found' },
          { status: 404 }
        );
      }
      logger.debug('Server fetched successfully', { serverId: id });
      return NextResponse.json(server);
    }

    const servers = await repository.findAll();
    logger.debug('Servers fetched successfully', { count: servers.length });
    return NextResponse.json(servers);
  } catch (error) {
    logger.error('Failed to fetch servers', error);
    return NextResponse.json(
      { error: 'Failed to fetch servers' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    logger.debug('Received create server request', { body });

    const validatedData = serverSchema.parse(body);
    
    // Verificar si ya existe un servidor con el mismo nombre o host:port
    const existingServer = await repository.findByHostAndPort(
      validatedData.host,
      validatedData.port
    );

    if (existingServer) {
      logger.warn('Server already exists', { 
        host: validatedData.host, 
        port: validatedData.port 
      });
      return NextResponse.json(
        { error: 'A server with this host and port already exists' },
        { status: 409 }
      );
    }

    const server = await repository.create(validatedData);
    logger.info('Server created successfully', { serverId: server.id });
    return NextResponse.json(server, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid server creation data', { error: error.errors });
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Failed to create server', error);
    return NextResponse.json(
      { error: 'Failed to create server' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    logger.debug('Received update server request', { body });

    if (!body.id) {
      logger.warn('Missing server id');
      return NextResponse.json(
        { error: 'Server id is required' },
        { status: 400 }
      );
    }

    const validatedData = serverSchema.parse(body);
    
    // Verificar si el servidor existe
    const existingServer = await repository.findById(body.id);
    if (!existingServer) {
      logger.warn('Server not found', { serverId: body.id });
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    // Verificar si el nuevo host:port no está en uso por otro servidor
    const conflictingServer = await repository.findByHostAndPort(
      validatedData.host,
      validatedData.port
    );
    if (conflictingServer && conflictingServer.id !== body.id) {
      logger.warn('Server host:port conflict', {
        host: validatedData.host,
        port: validatedData.port,
        existingServerId: conflictingServer.id
      });
      return NextResponse.json(
        { error: 'Another server is already using this host and port' },
        { status: 409 }
      );
    }

    const updatedServer = await repository.update(body.id, validatedData);
    logger.info('Server updated successfully', { serverId: body.id });
    return NextResponse.json(updatedServer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid server update data', { error: error.errors });
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Failed to update server', error);
    return NextResponse.json(
      { error: 'Failed to update server' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      logger.warn('Missing server id');
      return NextResponse.json(
        { error: 'Server id is required' },
        { status: 400 }
      );
    }

    const server = await repository.findById(Number(id));
    if (!server) {
      logger.warn('Server not found', { serverId: id });
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    await repository.delete(Number(id));
    logger.info('Server deleted successfully', { serverId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete server', error);
    return NextResponse.json(
      { error: 'Failed to delete server' },
      { status: 500 }
    );
  }
}