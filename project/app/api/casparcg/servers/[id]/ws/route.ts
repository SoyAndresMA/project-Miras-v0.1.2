import { NextResponse } from 'next/server';
import { WebSocketServer } from 'ws';
import { CasparServer } from '@/server/device/caspar/CasparServer';

const wss = new WebSocketServer({ noServer: true });

// Manejar upgrade de HTTP a WebSocket
export function GET(request: Request) {
  if (request.headers.get('upgrade') !== 'websocket') {
    return new NextResponse('Expected Websocket connection', { status: 400 });
  }

  wss.handleUpgrade(request, request.socket, Buffer.alloc(0), (ws) => {
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        const { serverId } = data;

        // Obtener instancia del servidor
        const server = await CasparServer.getInstance(serverId);
        if (!server) {
          ws.send(JSON.stringify({ error: 'Server not found' }));
          return;
        }

        // Suscribirse a eventos del servidor
        server.on('activity', (state) => {
          ws.send(JSON.stringify({
            type: 'activity',
            data: state
          }));
        });

        server.on('connectionChange', (state) => {
          ws.send(JSON.stringify({
            type: 'connectionChange',
            data: state
          }));
        });

      } catch (error) {
        console.error('WebSocket error:', error);
        ws.send(JSON.stringify({ error: 'Internal server error' }));
      }
    });

    ws.on('close', () => {
      // Limpiar suscripciones
    });
  });

  return new NextResponse(null, {
    status: 101,
    headers: {
      'Upgrade': 'websocket',
      'Connection': 'Upgrade'
    }
  });
}
