"use server";

import { EventRepository } from '../api/repositories/event.repository';

export async function updateEventUnion(eventId: number, unionId: number) {
  try {
    const eventRepo = EventRepository.getInstance();
    const event = await eventRepo.updateUnion(eventId, unionId);
    return { success: true, event };
  } catch (error) {
    console.error('Error updating event union:', error);
    return { success: false, error: 'Failed to update event union' };
  }
}