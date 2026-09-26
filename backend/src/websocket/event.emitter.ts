import { Server } from 'socket.io';
import { presenceManager } from './presence.manager.js';
import { TaskStatusChangedPayload } from './types.js';

let ioInstance: Server | null = null;

export const setSocketServer = (io: Server): void => {
  ioInstance = io;
};

export const getSocketServer = (): Server | null => {
  return ioInstance;
};

/**
 * Broadcasts task status change and activity event to the relevant project room.
 * Admin room also receives the activity event for organization-wide feed.
 */
export const emitTaskStatusChanged = (
  projectId: string,
  payload: TaskStatusChangedPayload
): void => {
  if (!ioInstance) return;

  const projectRoom = `project:${projectId}`;

  // Broadcast to all viewers currently in this project room
  ioInstance.to(projectRoom).emit('task:status_changed', payload);
  ioInstance.to(projectRoom).emit('activity:new', { activity: payload.activity });

  // Broadcast to Admins who view global activity
  ioInstance.to('role:admin').emit('activity:new', { activity: payload.activity });
};

/**
 * Emits an activity record creation to project room and admin room.
 */
export const emitActivityCreated = (projectId: string, activity: any): void => {
  if (!ioInstance) return;
  ioInstance.to(`project:${projectId}`).emit('activity:new', { activity });
  ioInstance.to('role:admin').emit('activity:new', { activity });
};

/**
 * Emits real-time notification to a specific user's private room.
 */
export const emitNotification = (userId: string, notification: any): void => {
  if (!ioInstance) return;
  ioInstance.to(`user:${userId}`).emit('notification:new', { notification });
};

/**
 * Broadcasts the current online user count to the Admin room.
 */
export const emitPresenceUpdate = (): void => {
  if (!ioInstance) return;
  const onlineCount = presenceManager.getOnlineUserCount();
  ioInstance.to('role:admin').emit('presence:update', { onlineCount });
};

/**
 * Emits updated unread notification count to a specific user's private room.
 */
export const emitUnreadCount = (userId: string, count: number): void => {
  if (!ioInstance) return;
  ioInstance.to(`user:${userId}`).emit('notification:unread_count', { unreadCount: count });
};
