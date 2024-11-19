import { CasparServer } from '@/server/device/caspar/CasparServer';
import { headers } from 'next/headers';

// Mapa para mantener las conexiones SSE activas por servidor
const serverConnections = new Map<number, Set<ReadableStreamController<any>>>();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const serverId = parseInt(params.id);
  if (isNaN(serverId)) {
    return new Response('Invalid server ID', { status: 400 });
  }

  // Configurar headers para SSE
  const headersList = headers();
  headersList.set('Content-Type', 'text/event-stream');
  headersList.set('Cache-Control', 'no-cache');
  headersList.set('Connection', 'keep-alive');

  try {
    // Crear stream para SSE
    const stream = new ReadableStream({
      start: async (controller) => {
        // Registrar la conexión
        if (!serverConnections.has(serverId)) {
          serverConnections.set(serverId, new Set());
        }
        serverConnections.get(serverId)?.add(controller);

        // Obtener instancia del servidor
        const server = await CasparServer.getInstance({ id: serverId });
        if (!server) {
          controller.close();
          return;
        }

        // Enviar estado inicial
        const initialState = server.getServerState();
        controller.enqueue(`data: ${JSON.stringify(initialState)}\n\n`);

        // Suscribirse a eventos de estado
        const onStateChange = (state: any) => {
          controller.enqueue(`data: ${JSON.stringify(state)}\n\n`);
        };

        server.on('stateChange', onStateChange);

        // Limpiar cuando el cliente se desconecta
        request.signal.addEventListener('abort', () => {
          server.off('stateChange', onStateChange);
          serverConnections.get(serverId)?.delete(controller);
          controller.close();
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error en SSE:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
