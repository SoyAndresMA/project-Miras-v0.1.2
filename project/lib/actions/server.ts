'use server';

import { CasparServer } from '@/server/device/caspar/CasparServer';

export async function getServerState() {
  const server = await CasparServer.getInstance({
    id: 1,
    name: 'LENOVO',
    host: '192.168.0.194',
    port: 5250,
    enabled: true
  });

  return CasparServer.getState(1);
}
