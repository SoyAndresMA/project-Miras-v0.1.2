import { NextResponse } from 'next/server';
import { LoggerService } from '@/lib/services/logger.service';
import { CasparServer } from '@/server/device/caspar/CasparServer';
import { DatabaseService } from '@/server/services/database.service';

const context = 'CasparServerStateAPI';
const logger = LoggerService.create(context);

export async function GET(
  request: Request,
  { params }: { params: { serverId: string } }
) {
  logger.debug({ serverId: params.serverId }, 'Verificando estado del servidor');
  
  try {
    const serverId = parseInt(params.serverId);
    if (isNaN(serverId)) {
      logger.warn({ serverId: params.serverId }, 'ID de servidor inválido');
      return NextResponse.json(
        { error: 'Invalid server ID' },
        { status: 400 }
      );
    }

    const dbService = DatabaseService.getInstance();
    
    // Obtener la configuración del servidor de la base de datos
    const serverConfig = await dbService.query(
      'SELECT * FROM casparcg_servers WHERE id = ?',
      [serverId]
    );

    if (!serverConfig || serverConfig.length === 0) {
      logger.warn({ serverId }, 'Servidor no encontrado');
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    const config = serverConfig[0];
    
    // Obtener la instancia del servidor y su estado actual
    const server = await CasparServer.getInstance({
      id: config.id,
      name: config.name,
      host: config.host,
      port: config.port,
      enabled: Boolean(config.enabled),
      commandTimeout: config.command_timeout || 5000
    });

    // Obtener el estado actual del servidor
    const serverState = server.getServerState();
    
    logger.debug({ serverId, state: serverState }, 'Estado del servidor obtenido');
    return NextResponse.json(serverState);
  } catch (error) {
    logger.error({ serverId: params.serverId }, 'Error al verificar estado', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
