import assert from 'node:assert/strict';
import http from 'http';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { app } from '../src/app.js';
import { initSocketServer } from '../src/websocket/socket.server.js';
import { notificationService } from '../src/services/notification.service.js';
import { emitUnreadCount } from '../src/websocket/event.emitter.js';
import { signAccessToken } from '../src/utils/jwt.js';
import { Role } from '@prisma/client';

async function runNotificationTests() {
  console.log('🧪 Starting Phase 9 In-App Notifications Tests...\n');

  const server = http.createServer(app);
  const ioServer = initSocketServer(server);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const devUserId = '00000000-0000-0000-0000-000000000015';
  const devToken = signAccessToken({
    sub: devUserId,
    email: 'dev@velozity.internal',
    role: Role.DEVELOPER,
  });

  try {
    // -------------------------------------------------------------------------
    // Test 1: HTTP Endpoint Authentication & Query Validation
    // -------------------------------------------------------------------------
    console.log('Test 1: Unauthenticated request to /api/notifications rejected...');
    const noAuthRes = await fetch(`${baseUrl}/api/notifications`);
    assert.equal(noAuthRes.status, 401);
    console.log('✅ Unauthenticated access rejected with 401.\n');

    console.log('Test 2: Query validation rejecting excessive limit...');
    const badLimitRes = await fetch(`${baseUrl}/api/notifications?limit=200`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const badLimitJson = await badLimitRes.json() as any;
    assert.equal(badLimitRes.status, 400);
    assert.equal(badLimitJson.error.code, 'VALIDATION_ERROR');
    console.log('✅ Excessive limit rejected with 400 VALIDATION_ERROR.\n');

    // -------------------------------------------------------------------------
    // Test 3: Unit Verification of Notification Service Contract
    // -------------------------------------------------------------------------
    console.log('Test 3: Notification Service methods registration...');
    assert.ok(typeof notificationService.createNotification === 'function');
    assert.ok(typeof notificationService.getUserNotifications === 'function');
    assert.ok(typeof notificationService.getUnreadCount === 'function');
    assert.ok(typeof notificationService.markAsRead === 'function');
    assert.ok(typeof notificationService.markAllAsRead === 'function');
    console.log('✅ NotificationService contracts verified.\n');

    // -------------------------------------------------------------------------
    // Test 4: Live WebSocket Unread Count Push (No polling!)
    // -------------------------------------------------------------------------
    console.log('Test 4: Real-time unread count update pushed via WebSocket...');
    let clientSocket: ClientSocket | null = null;

    await new Promise<void>((resolve, reject) => {
      clientSocket = ioClient(baseUrl, {
        transports: ['websocket'],
        reconnection: false,
        auth: { token: devToken },
      });

      clientSocket.on('connect_error', reject);

      clientSocket.on('connect', () => {
        // Listen for live unread count push
        clientSocket!.on('notification:unread_count', (data) => {
          assert.equal(data.unreadCount, 5, 'Unread count must match pushed value');
          resolve();
        });

        // Trigger live unread count update
        setTimeout(() => {
          emitUnreadCount(devUserId, 5);
        }, 100);
      });
    });

    clientSocket?.disconnect();
    console.log('✅ Real-time unread count pushed via WebSocket without polling!\n');

    console.log('🎉 All Phase 9 In-App Notifications tests passed!\n');
  } finally {
    ioServer.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

runNotificationTests().catch((err) => {
  console.error('❌ Notification Test failed:', err);
  process.exit(1);
});
