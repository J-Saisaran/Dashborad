/**
 * Tracks real-time active users and multi-tab socket connections.
 * Ensures multi-tab connections from the same user ID are deduplicated.
 */
export class PresenceManager {
  private activeUsers = new Map<string, Set<string>>();

  /**
   * Register a connected socket for a user.
   * @returns true if user just came online (first active tab).
   */
  addConnection(userId: string, socketId: string): boolean {
    const sockets = this.activeUsers.get(userId);
    if (!sockets) {
      this.activeUsers.set(userId, new Set([socketId]));
      return true; // Newly online
    }
    sockets.add(socketId);
    return false; // Already online from another tab
  }

  /**
   * Unregister a disconnected socket for a user.
   * @returns true if user went offline (last active tab closed).
   */
  removeConnection(userId: string, socketId: string): boolean {
    const sockets = this.activeUsers.get(userId);
    if (!sockets) {
      return false;
    }

    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.activeUsers.delete(userId);
      return true; // Newly offline
    }
    return false; // Still online in another tab
  }

  /**
   * Get total unique active users currently online.
   * Required for Admin dashboard: "active users online, online count must update through WebSocket presence"
   */
  getOnlineUserCount(): number {
    return this.activeUsers.size;
  }

  /**
   * Check if a specific user is currently online.
   */
  isUserOnline(userId: string): boolean {
    const sockets = this.activeUsers.get(userId);
    return !!sockets && sockets.size > 0;
  }

  /**
   * Clear all active connections (used in tests or server restart).
   */
  clear(): void {
    this.activeUsers.clear();
  }
}

export const presenceManager = new PresenceManager();
