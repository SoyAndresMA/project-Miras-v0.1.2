"use server";

import { CasparServer } from '@/server/device/caspar/CasparServer';
import { LoggerService } from '@/lib/services/logger.service';

const context = 'ServerActions';
const logger = LoggerService.create(context);

export async function getServerState(serverId: number) {
  logger.debug('Getting server state', { serverId });
  
  try {
    const state = await CasparServer.getState(serverId);
    logger.debug('Server state retrieved', { serverId, state });
    return state;
  } catch (error) {
    logger.error('Failed to get server state', { serverId, error });
    throw error;
  }
}
