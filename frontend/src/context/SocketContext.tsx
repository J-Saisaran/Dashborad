import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '../api/client.ts';
import type { Activity, Notification, Task } from '../types/index.ts';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  onlineCount: number;
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  recentActivities: Activity[];
  latestTaskUpdate: { task: Task; previousStatus: string; newStatus: string } | null;
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  requestCatchup: (projectId: string, since?: string) => Promise<Activity[]>;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode; user: any }> = ({
  children,
  user,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [latestTaskUpdate, setLatestTaskUpdate] = useState<any>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const newSocket = io('http://localhost:5000', {
      transports: ['websocket'],
      auth: { token },
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Real-time Presence
    newSocket.on('presence:update', (data: { onlineCount: number }) => {
      setOnlineCount(data.onlineCount);
    });

    // Real-time Unread Notification Count
    newSocket.on('notification:unread_count', (data: { unreadCount: number }) => {
      setUnreadCount(data.unreadCount);
    });

    // Real-time New Notification
    newSocket.on('notification:new', (_data: { notification: Notification }) => {
      setUnreadCount((prev) => prev + 1);
    });

    // Real-time Task Status Changed
    newSocket.on('task:status_changed', (data: any) => {
      setLatestTaskUpdate(data);
    });

    // Real-time New Activity
    newSocket.on('activity:new', (data: { activity: Activity }) => {
      setRecentActivities((prev) => [data.activity, ...prev.slice(0, 19)]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const joinProject = (projectId: string) => {
    socket?.emit('project:join', { projectId });
  };

  const leaveProject = (projectId: string) => {
    socket?.emit('project:leave', { projectId });
  };

  const requestCatchup = (projectId: string, since?: string): Promise<Activity[]> => {
    return new Promise((resolve) => {
      if (!socket) return resolve([]);
      socket.emit('activity:catchup', { projectId, since }, (response: any) => {
        if (response?.success && response?.data?.activities) {
          setRecentActivities(response.data.activities);
          resolve(response.data.activities);
        } else {
          resolve([]);
        }
      });
    });
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineCount,
        unreadCount,
        setUnreadCount,
        recentActivities,
        latestTaskUpdate,
        joinProject,
        leaveProject,
        requestCatchup,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
