import { NextResponse } from 'next/server';
import { WebSocketServer } from 'ws';
import { CasparServer } from '@/server/device/caspar/CasparServer';

let wss: WebSocketServer;

if (!wss) {
  wss = new WebSocketServer({ noServer: true });

  // Manejar conexiones WebSocket
  wss.on('connection', (ws) => {
    // Enviar estado inicial
    const server = CasparServer.getInstance({
      id: 1,
      name: 'LENOVO',
      host: '192.168.0.194',
      port: 5250,
      enabled: true
    });

    const sendStatus = () => {
      ws.send(JSON.stringify({
        type: 'serverStatus',
        serverId: 1,
        connected: server.isConnected()
      }));
    };

    // Enviar estado inicial
    sendStatus();

    // Suscribirse a cambios de estado
    server.on('connectionChange', sendStatus);

    // Limpiar al desconectar
    ws.on('close', () => {
      server.off('connectionChange', sendStatus);
    });
  });
}

export function GET() {
  // Este endpoint se usa solo para establecer la conexión WebSocket
  return new NextResponse('WebSocket endpoint');
}

export const dynamic = 'force-dynamic';
