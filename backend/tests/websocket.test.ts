import assert from 'node:assert/strict';
import http from 'http';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { app } from '../src/app.js';
import { initSocketServer } from '../src/websocket/socket.server.js';
import { PresenceManager } from '../src/websocket/presence.manager.js';
import { emitTaskStatusChanged, emitNotification } from '../src/websocket/event.emitter.js';
import { signAccessToken } from '../src/utils/jwt.js';
import { Role, TaskPriority, TaskStatus } from '@prisma/client';
import { authorizationService } from '../src/services/authorization.service.js';

// Mock DB access for isolated WebSocket unit testing
authorizationService.validateProjectAccess = async () => ({
  id: '00000000-0000-0000-0000-000000000099',
} as any);

async function runWebSocketTests() {
  console.log('🧪 Starting Phase 7 WebSocket Infrastructure Tests...\n');

  // -------------------------------------------------------------------------
  // Part 1: Presence Manager Multi-Tab Deduplication Unit Tests
  // -------------------------------------------------------------------------
  console.log('Test 1: Presence Manager multi-tab tracking & deduplication...');
  const testPresence = new PresenceManager();

  // User 1 opens Tab 1
  assert.equal(testPresence.addConnection('user-1', 'sock-1'), true, 'First connection -> online');
  assert.equal(testPresence.getOnlineUserCount(), 1);

  // User 1 opens Tab 2
  assert.equal(testPresence.addConnection('user-1', 'sock-2'), false, 'Second tab -> already online');
  assert.equal(testPresence.getOnlineUserCount(), 1, 'Multi-tab count must stay 1');

  // User 2 opens Tab 1
  assert.equal(testPresence.addConnection('user-2', 'sock-3'), true, 'Second user -> online');
  assert.equal(testPresence.getOnlineUserCount(), 2, 'Two unique users online');

  // User 1 closes Tab 1
  assert.equal(testPresence.removeConnection('user-1', 'sock-1'), false, 'User 1 still active on tab 2');
  assert.equal(testPresence.getOnlineUserCount(), 2);

  // User 1 closes Tab 2
  assert.equal(testPresence.removeConnection('user-1', 'sock-2'), true, 'User 1 last tab closed -> offline');
  assert.equal(testPresence.getOnlineUserCount(), 1, 'Only user 2 remains online');

  console.log('✅ Presence Manager multi-tab deduplication verified.\n');

  // -------------------------------------------------------------------------
  // Part 2: Live WebSocket Handshake & Event Flow Tests
  // -------------------------------------------------------------------------
  const server = http.createServer(app);
  const ioServer = initSocketServer(server);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const wsUrl = `http://127.0.0.1:${port}`;

  const adminToken = signAccessToken({
    sub: '00000000-0000-0000-0000-000000000001',
    email: 'admin@velozity.internal',
    role: Role.ADMIN,
  });

  try {
    // -----------------------------------------------------------------------
    // Test 2: Connection rejected without token
    // -----------------------------------------------------------------------
    console.log('Test 2: Socket connection without token must be rejected...');
    await new Promise<void>((resolve, reject) => {
      const socket = ioClient(wsUrl, {
        transports: ['websocket'],
        reconnection: false,
      });

      socket.on('connect', () => {
        socket.disconnect();
        reject(new Error('Connection without token should have failed!'));
      });

      socket.on('connect_error', (err) => {
        assert.ok(err.message.includes('Authentication token is required'));
        socket.disconnect();
        resolve();
      });
    });
    console.log('✅ Socket handshake rejected missing token.\n');

    // -----------------------------------------------------------------------
    // Test 3: Connection rejected with tampered token
    // -----------------------------------------------------------------------
    console.log('Test 3: Socket connection with tampered token must be rejected...');
    await new Promise<void>((resolve, reject) => {
      const socket = ioClient(wsUrl, {
        transports: ['websocket'],
        reconnection: false,
        auth: { token: `${adminToken}tampered` },
      });

      socket.on('connect', () => {
        socket.disconnect();
        reject(new Error('Connection with tampered token should have failed!'));
      });

      socket.on('connect_error', (err) => {
        assert.ok(err.message.includes('Authentication failed'));
        socket.disconnect();
        resolve();
      });
    });
    console.log('✅ Socket handshake rejected tampered token.\n');

    // -----------------------------------------------------------------------
    // Test 4: Authenticated connection succeeds and receives live events
    // -----------------------------------------------------------------------
    console.log('Test 4: Authenticated socket connects and receives live events...');
    let clientSocket: ClientSocket | null = null;

    await new Promise<void>((resolve, reject) => {
      clientSocket = ioClient(wsUrl, {
        transports: ['websocket'],
        reconnection: false,
        auth: { token: adminToken },
      });

      clientSocket.on('connect_error', reject);

      clientSocket.on('connect', async () => {
        // Admin socket is now connected!
        // Join project room
        const testProjectId = '00000000-0000-0000-0000-000000000099';
        clientSocket!.emit('project:join', { projectId: testProjectId });

        // Setup listeners for task status change and activity events
        let receivedTaskUpdate = false;
        let receivedActivityUpdate = false;

        clientSocket!.on('task:status_changed', (data) => {
          assert.equal(data.previousStatus, 'TO_DO');
          assert.equal(data.newStatus, 'IN_PROGRESS');
          receivedTaskUpdate = true;
          checkDone();
        });

        clientSocket!.on('activity:new', (data) => {
          assert.ok(data.activity.summary.includes('moved'));
          receivedActivityUpdate = true;
          checkDone();
        });

        function checkDone() {
          if (receivedTaskUpdate && receivedActivityUpdate) {
            resolve();
          }
        }

        // Wait a tick for room join, then broadcast event via emitter
        setTimeout(() => {
          emitTaskStatusChanged(testProjectId, {
            task: {
              id: 'task-test-1',
              title: 'Implement Auth',
              description: 'JWT Auth',
              status: TaskStatus.IN_PROGRESS,
              priority: TaskPriority.HIGH,
              dueDate: new Date(),
              projectId: testProjectId,
              assignedToId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            activity: {
              id: 'act-test-1',
              taskId: 'task-test-1',
              projectId: testProjectId,
              userId: '00000000-0000-0000-0000-000000000001',
              previousStatus: 'TO_DO',
              newStatus: 'IN_PROGRESS',
              summary: 'Admin moved "Implement Auth" from To Do → In Progress',
              createdAt: new Date(),
              relativeTime: 'just now',
              displayMessage: 'Admin moved "Implement Auth" from To Do → In Progress · just now',
            },
            previousStatus: 'TO_DO',
            newStatus: 'IN_PROGRESS',
          });
        }, 100);
      });
    });

    console.log('✅ Real-time task status change and activity events received via WebSocket!\n');

    // -----------------------------------------------------------------------
    // Test 5: Real-time user notification event
    // -----------------------------------------------------------------------
    console.log('Test 5: Real-time private user notification event...');
    await new Promise<void>((resolve) => {
      clientSocket!.on('notification:new', (data) => {
        assert.equal(data.notification.title, 'Task Assigned');
        resolve();
      });

      emitNotification('00000000-0000-0000-0000-000000000001', {
        title: 'Task Assigned',
        message: 'You have been assigned to Task #1',
      });
    });
    console.log('✅ Private notification received in real time on user room!\n');

    clientSocket?.disconnect();
    console.log('🎉 All Phase 7 WebSocket Infrastructure tests passed!\n');
  } finally {
    ioServer.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

runWebSocketTests().catch((err) => {
  console.error('❌ WebSocket Test failed:', err);
  process.exit(1);
});
