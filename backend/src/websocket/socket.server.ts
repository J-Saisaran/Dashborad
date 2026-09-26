import http from 'http';
import { Server } from 'socket.io';
import { Role } from '@prisma/client';
import { env } from '../config/environment.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { authorizationService } from '../services/authorization.service.js';
import { activityService } from '../services/activity.service.js';
import { presenceManager } from './presence.manager.js';
import { emitPresenceUpdate, setSocketServer } from './event.emitter.js';
import { AuthenticatedSocket } from './types.js';

export const initSocketServer = (httpServer: http.Server): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
    transports: ['websocket'], // Strictly WebSocket as required (no polling fallback)
  });

  // 1. Handshake Authentication Middleware
  io.use((socket, next) => {
    try {
      const authHeader = socket.handshake.headers.authorization;
      const authToken = socket.handshake.auth?.token;

      let token: string | undefined = authToken;
      if (!token && authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }

      if (!token) {
        return next(new Error('Authentication token is required'));
      }

      const payload = verifyAccessToken(token);
      socket.data.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      next();
    } catch (err: any) {
      next(new Error(`Authentication failed: ${err.message}`));
    }
  });

  // 2. Connection Lifecycle & Room Management
  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.data.user;

    // Join personal private room for direct notifications
    socket.join(`user:${user.id}`);

    // Join Admin role room if Admin
    if (user.role === Role.ADMIN) {
      socket.join('role:admin');
      // Send immediate initial presence count to Admin socket
      socket.emit('presence:update', {
        onlineCount: presenceManager.getOnlineUserCount() + (presenceManager.isUserOnline(user.id) ? 0 : 1),
      });
    }

    // Register active connection
    const cameOnline = presenceManager.addConnection(user.id, socket.id);
    if (cameOnline) {
      emitPresenceUpdate();
    }

    // Project room subscription
    socket.on('project:join', async (data: { projectId: string }) => {
      try {
        if (!data || !data.projectId) return;

        // Authorize user before letting them join the project room
        await authorizationService.validateProjectAccess(user, data.projectId, 'read');
        socket.join(`project:${data.projectId}`);
      } catch {
        socket.emit('error', {
          code: 'UNAUTHORIZED_PROJECT_ROOM',
          message: 'Access to project room denied',
        });
      }
    });

    socket.on('project:leave', (data: { projectId: string }) => {
      if (data && data.projectId) {
        socket.leave(`project:${data.projectId}`);
      }
    });

    // Reconnect catch-up protocol: Fetch last 20 missed events directly from PostgreSQL
    socket.on(
      'activity:catchup',
      async (
        data: { projectId: string; since?: string },
        callback?: (res: { success: boolean; data?: { activities: any[] }; error?: string }) => void
      ) => {
        try {
          if (!data || !data.projectId) {
            if (typeof callback === 'function') callback({ success: false, error: 'projectId is required' });
            return;
          }
          const activities = await activityService.getMissedActivities(user, data.projectId, data.since);
          if (typeof callback === 'function') {
            callback({ success: true, data: { activities } });
          } else {
            socket.emit('activity:catchup_response', { projectId: data.projectId, activities });
          }
        } catch (err: any) {
          if (typeof callback === 'function') {
            callback({ success: false, error: err.message });
          }
        }
      }
    );

    // Handle Disconnect
    socket.on('disconnect', () => {
      const wentOffline = presenceManager.removeConnection(user.id, socket.id);
      if (wentOffline) {
        emitPresenceUpdate();
      }
    });
  });

  setSocketServer(io);
  return io;
};
