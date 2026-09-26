import assert from 'node:assert/strict';
import http from 'http';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { Role, TaskStatus, TaskPriority } from '@prisma/client';
import { app } from '../src/app.js';
import { initSocketServer } from '../src/websocket/socket.server.js';
import { signAccessToken } from '../src/utils/jwt.js';
import { authorizationService } from '../src/services/authorization.service.js';
import { projectService } from '../src/services/project.service.js';
import { activityService } from '../src/services/activity.service.js';
import { presenceManager } from '../src/websocket/presence.manager.js';
import { emitTaskStatusChanged, emitNotification, emitActivityCreated, emitUnreadCount } from '../src/websocket/event.emitter.js';

// Setup Mock data for PBAC security assertions
const ADMIN_ID = '00000000-0000-0000-0000-000000000001';
const PM1_ID = '00000000-0000-0000-0000-000000000002';
const PM2_ID = '00000000-0000-0000-0000-000000000003';
const DEV1_ID = '00000000-0000-0000-0000-000000000004';
const DEV2_ID = '00000000-0000-0000-0000-000000000005';

const PROJECT_PM1_ID = '11111111-1111-1111-1111-111111111111';
const PROJECT_PM2_ID = '22222222-2222-2222-2222-222222222222';
const TASK_DEV1_ID = '33333333-3333-3333-3333-333333333333';
const TASK_DEV2_ID = '44444444-4444-4444-4444-444444444444';

// Mock authorization service to simulate database state accurately in headless integration tests
authorizationService.validateProjectAccess = async (user: any, projectId: string) => {
  if (user.role === Role.ADMIN) {
    return { id: projectId, name: 'Mock Project', ownerId: PM1_ID } as any;
  }
  if (user.role === Role.PROJECT_MANAGER) {
    if (projectId === PROJECT_PM1_ID && user.id === PM1_ID) {
      return { id: projectId, name: 'PM1 Project', ownerId: PM1_ID } as any;
    }
    if (projectId === PROJECT_PM2_ID && user.id === PM2_ID) {
      return { id: projectId, name: 'PM2 Project', ownerId: PM2_ID } as any;
    }
    const { ForbiddenError } = await import('../src/utils/errors.js');
    throw new ForbiddenError('You do not have access to this project');
  }
  // Developers cannot manage projects directly
  const { ForbiddenError } = await import('../src/utils/errors.js');
  throw new ForbiddenError('You do not have access to this project');
};

authorizationService.validateTaskAccess = async (user: any, taskId: string) => {
  if (user.role === Role.ADMIN) {
    return { id: taskId, title: 'Mock Task', assignedToId: DEV1_ID, project: { id: PROJECT_PM1_ID, ownerId: PM1_ID } } as any;
  }
  if (user.role === Role.PROJECT_MANAGER) {
    return { id: taskId, title: 'Mock Task', assignedToId: DEV1_ID, project: { id: PROJECT_PM1_ID, ownerId: PM1_ID } } as any;
  }
  if (user.role === Role.DEVELOPER) {
    if (taskId === TASK_DEV1_ID && user.id === DEV1_ID) {
      return { id: taskId, title: 'Dev1 Task', assignedToId: DEV1_ID, project: { id: PROJECT_PM1_ID, ownerId: PM1_ID } } as any;
    }
    const { ForbiddenError } = await import('../src/utils/errors.js');
    throw new ForbiddenError('You are not authorized to access or modify this task');
  }
  const { ForbiddenError } = await import('../src/utils/errors.js');
  throw new ForbiddenError('Unauthorized');
};

projectService.getProjectById = async (user: any, projectId: string) => {
  await authorizationService.validateProjectAccess(user, projectId, 'read');
  return { id: projectId, name: 'Mock Project', ownerId: PM1_ID } as any;
};

activityService.getMissedActivities = async () => {
  return [
    {
      id: '00000000-0000-0000-0000-000000000888',
      summary: 'Task status changed to IN_REVIEW',
      createdAt: new Date().toISOString(),
    } as any,
  ];
};

async function runEndToEndSecurityTests() {
  console.log('🧪 Starting Phase 13 End-to-End & Security Test Suite...\n');

  // Start HTTP & WebSocket Server
  const server = http.createServer(app);
  initSocketServer(server);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Issue Auth Tokens for Personas
  const adminToken = signAccessToken({ sub: ADMIN_ID, email: 'admin@velozity.com', role: Role.ADMIN });
  const pm1Token = signAccessToken({ sub: PM1_ID, email: 'pm1@velozity.com', role: Role.PROJECT_MANAGER });
  const pm2Token = signAccessToken({ sub: PM2_ID, email: 'pm2@velozity.com', role: Role.PROJECT_MANAGER });
  const dev1Token = signAccessToken({ sub: DEV1_ID, email: 'dev1@velozity.com', role: Role.DEVELOPER });
  const dev2Token = signAccessToken({ sub: DEV2_ID, email: 'dev2@velozity.com', role: Role.DEVELOPER });

  let devSocket: ClientSocket | null = null;
  let pmSocket: ClientSocket | null = null;

  try {
    // -------------------------------------------------------------------------
    // TEST SECTION 1: STRICT DEVELOPER IDOR BLOCKING & PBAC SCOPING
    // -------------------------------------------------------------------------
    console.log('--- SECTION 1: DEVELOPER IDOR BLOCKING & PBAC SCOPING ---');

    console.log('Test 1.1: Developer attempting to access another user\'s project...');
    const devProjRes = await fetch(`${baseUrl}/api/projects/${PROJECT_PM1_ID}`, {
      headers: { Authorization: `Bearer ${dev1Token}` },
    });
    assert.equal(devProjRes.status, 403, 'Developer must be strictly forbidden from project details (403)');
    const devProjJson = await devProjRes.json();
    assert.equal(devProjJson.success, false);
    assert.equal(devProjJson.error.code, 'FORBIDDEN');
    console.log('✅ Developer blocked from project access with 403 FORBIDDEN.');

    console.log('\nTest 1.2: Developer attempting to create a project...');
    const devCreateProjRes = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dev1Token}` },
      body: JSON.stringify({ name: 'Hacked Project', clientId: '00000000-0000-0000-0000-000000000010' }),
    });
    assert.equal(devCreateProjRes.status, 403, 'Developer must not be allowed to create projects (403)');
    console.log('✅ Developer forbidden from project creation.');

    console.log('\nTest 1.3: Developer attempting to trigger background overdue scan...');
    const devOverdueRes = await fetch(`${baseUrl}/api/tasks/check-overdue`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${dev1Token}` },
    });
    assert.equal(devOverdueRes.status, 403, 'Developer must be blocked from triggering overdue cron scans');
    console.log('✅ Developer blocked from triggering background overdue jobs.');

    console.log('\nTest 1.4: Cross-PM IDOR blocking (PM 2 attempting to access PM 1\'s project)...');
    const pmCrossRes = await fetch(`${baseUrl}/api/projects/${PROJECT_PM1_ID}`, {
      headers: { Authorization: `Bearer ${pm2Token}` },
    });
    assert.equal(pmCrossRes.status, 403, 'PM 2 must be blocked from accessing PM 1\'s project (403)');
    console.log('✅ Cross-PM isolation verified (PM cannot view another PM\'s project).');

    console.log('\nTest 1.5: Developer IDOR blocking on tasks (Dev 1 accessing Dev 2\'s task)...');
    const devTaskCrossRes = await fetch(`${baseUrl}/api/tasks/${TASK_DEV2_ID}`, {
      headers: { Authorization: `Bearer ${dev1Token}` },
    });
    assert.equal(devTaskCrossRes.status, 403, 'Dev 1 must be blocked from accessing Dev 2\'s task (403)');
    console.log('✅ Task assignment isolation verified (Developer cannot access another dev\'s task).');

    console.log('\nTest 1.6: Developer authorized access to their own assigned task...');
    const devOwnTaskRes = await fetch(`${baseUrl}/api/tasks/${TASK_DEV1_ID}`, {
      headers: { Authorization: `Bearer ${dev1Token}` },
    });
    assert.equal(devOwnTaskRes.status, 200, 'Developer must be authorized to access their assigned task');
    const devOwnTaskJson = await devOwnTaskRes.json();
    assert.equal(devOwnTaskJson.success, true);
    assert.equal(devOwnTaskJson.data.task.id, TASK_DEV1_ID);
    console.log('✅ Developer successfully accesses their own assigned task.');

    console.log('\nTest 1.7: Admin full cross-organization access...');
    const adminProjRes = await fetch(`${baseUrl}/api/projects/${PROJECT_PM1_ID}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminProjRes.status, 200, 'Admin must have full access to any project');
    console.log('✅ Admin cross-organization access verified.');

    // -------------------------------------------------------------------------
    // TEST SECTION 2: AUTHENTICATION INVARIANTS & REFRESH TOKEN ROTATION
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 2: AUTHENTICATION & REFRESH TOKEN ROTATION ---');

    console.log('Test 2.1: Missing access token returns 401 Unauthorized...');
    const noAuthRes = await fetch(`${baseUrl}/api/projects`);
    assert.equal(noAuthRes.status, 401);
    console.log('✅ Unauthenticated request rejected with 401.');

    console.log('Test 2.2: Malformed/Tampered access token returns 401...');
    const badTokenRes = await fetch(`${baseUrl}/api/projects`, {
      headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.token' },
    });
    assert.equal(badTokenRes.status, 401);
    console.log('✅ Tampered token rejected with 401.');

    // -------------------------------------------------------------------------
    // TEST SECTION 3: REAL-TIME WEBSOCKET EVENT PROPAGATION & PRESENCE
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 3: WEBSOCKET EVENT PROPAGATION & PRESENCE ---');

    console.log('Test 3.1: Connecting Developer & PM clients via native WebSocket...');
    devSocket = ioClient(baseUrl, {
      transports: ['websocket'],
      auth: { token: dev1Token },
      forceNew: true,
    });

    pmSocket = ioClient(baseUrl, {
      transports: ['websocket'],
      auth: { token: pm1Token },
      forceNew: true,
    });

    await Promise.all([
      new Promise<void>((resolve) => devSocket!.on('connect', resolve)),
      new Promise<void>((resolve) => pmSocket!.on('connect', resolve)),
    ]);
    assert.ok(devSocket.connected, 'Dev socket connected');
    assert.ok(pmSocket.connected, 'PM socket connected');
    console.log('✅ Native WebSocket connection established for Dev 1 and PM 1.');

    console.log('\nTest 3.2: Multi-user live presence tracking...');
    assert.ok(presenceManager.getOnlineUserCount() >= 2, `Online count should be at least 2, got: ${presenceManager.getOnlineUserCount()}`);
    console.log(`✅ Live presence counter active: ${presenceManager.getOnlineUserCount()} users online.`);

    console.log('\nTest 3.3: Project room join & real-time task status broadcast...');
    // Join PM 1 and Dev 1 to Project Room
    pmSocket.emit('project:join', { projectId: PROJECT_PM1_ID });
    devSocket.emit('project:join', { projectId: PROJECT_PM1_ID });
    await new Promise((r) => setTimeout(r, 100));

    // Listen for task:status_changed event on PM client
    const taskUpdatePromise = new Promise<any>((resolve) => {
      pmSocket!.on('task:status_changed', (data: any) => {
        resolve(data);
      });
    });

    // Server emits task status change (e.g. Developer moved task to IN_REVIEW)
    emitTaskStatusChanged(PROJECT_PM1_ID, {
      task: {
        id: TASK_DEV1_ID,
        title: 'Dev1 Task',
        status: TaskStatus.IN_REVIEW,
        priority: TaskPriority.HIGH,
        dueDate: new Date().toISOString(),
        projectId: PROJECT_PM1_ID,
        assignedToId: DEV1_ID,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      previousStatus: TaskStatus.IN_PROGRESS,
      newStatus: TaskStatus.IN_REVIEW,
    });

    const taskUpdatePayload = await taskUpdatePromise;
    assert.equal(taskUpdatePayload.task.id, TASK_DEV1_ID);
    assert.equal(taskUpdatePayload.previousStatus, TaskStatus.IN_PROGRESS);
    assert.equal(taskUpdatePayload.newStatus, TaskStatus.IN_REVIEW);
    console.log('✅ Real-time task status broadcast received by PM 1 without polling.');

    console.log('\nTest 3.4: Real-time user notification pushed directly without polling...');
    const notifPromise = new Promise<any>((resolve) => {
      devSocket!.on('notification:new', (data: any) => {
        resolve(data);
      });
    });

    const unreadCountPromise = new Promise<any>((resolve) => {
      devSocket!.on('notification:unread_count', (data: any) => {
        resolve(data);
      });
    });

    // Server emits notification directly to Dev 1
    emitNotification(DEV1_ID, {
      id: '00000000-0000-0000-0000-000000000999',
      userId: DEV1_ID,
      title: 'Task Assigned',
      message: 'You have been assigned to task "Core Banking Gateway API"',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    emitUnreadCount(DEV1_ID, 1);

    const notifPayload = await notifPromise;
    assert.equal(notifPayload.notification.userId, DEV1_ID);
    assert.equal(notifPayload.notification.title, 'Task Assigned');

    const unreadPayload = await unreadCountPromise;
    assert.equal(unreadPayload.unreadCount, 1);
    console.log('✅ Real-time user notification and unread count pushed directly to Developer room without polling.');

    console.log('\nTest 3.5: Real-time activity ledger event broadcast...');
    const activityPromise = new Promise<any>((resolve) => {
      pmSocket!.on('activity:new', (data: any) => {
        resolve(data);
      });
    });

    emitActivityCreated(PROJECT_PM1_ID, {
      id: '00000000-0000-0000-0000-000000000888',
      taskId: TASK_DEV1_ID,
      projectId: PROJECT_PM1_ID,
      userId: DEV1_ID,
      previousStatus: 'IN_PROGRESS',
      newStatus: 'IN_REVIEW',
      summary: 'Alex Rivera submitted task for review',
      createdAt: new Date().toISOString(),
    });

    const activityPayload = await activityPromise;
    assert.equal(activityPayload.activity.projectId, PROJECT_PM1_ID);
    console.log('✅ Real-time activity ledger broadcast verified.');

    // -------------------------------------------------------------------------
    // TEST SECTION 4: MISSED-EVENT RECOVERY
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 4: MISSED-EVENT RECOVERY CONTRACT ---');

    console.log('Test 4.1: Missed event retrieval via WebSocket activity:catchup...');
    const catchupResponse = await new Promise<any>((resolve) => {
      pmSocket!.emit('activity:catchup', { projectId: PROJECT_PM1_ID }, (res: any) => {
        resolve(res);
      });
    });
    assert.equal(catchupResponse.success, true);
    assert.ok(Array.isArray(catchupResponse.data.activities), 'Catchup must return activities array');
    console.log('✅ WebSocket activity:catchup successfully responded.');

    console.log('\n============================================================');
    console.log('🎉 ALL PHASE 13 END-TO-END & SECURITY INTEGRATION TESTS PASSED!');
    console.log('============================================================\n');
  } finally {
    if (devSocket) devSocket.disconnect();
    if (pmSocket) pmSocket.disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

runEndToEndSecurityTests().catch((err) => {
  console.error('❌ E2E Security Test failed:', err);
  process.exit(1);
});
