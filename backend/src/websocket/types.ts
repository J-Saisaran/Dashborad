import { Socket } from 'socket.io';
import { Task, Activity } from '@prisma/client';
import { AuthenticatedUser } from '../types/auth.types.js';

export interface AuthenticatedSocketData {
  user: AuthenticatedUser;
}

export type AuthenticatedSocket = Socket<any, any, any, AuthenticatedSocketData>;

export interface TaskStatusChangedPayload {
  task: Task;
  activity: Activity & { relativeTime?: string; displayMessage?: string };
  previousStatus: string;
  newStatus: string;
}

export interface PresenceUpdatePayload {
  onlineCount: number;
}
