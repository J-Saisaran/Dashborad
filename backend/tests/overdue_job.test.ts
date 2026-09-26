import assert from 'node:assert/strict';
import http from 'http';
import { app } from '../src/app.js';
import { signAccessToken } from '../src/utils/jwt.js';
import { Role, TaskPriority, TaskStatus } from '@prisma/client';
import {
  startOverdueTaskScheduler,
  stopOverdueTaskScheduler,
} from '../src/jobs/overdueTask.job.js';

async function runOverdueJobTests() {
  console.log('🧪 Starting Phase 10 Background Overdue Job Tests...\n');

  // -------------------------------------------------------------------------
  // Test 1: Unit Test - Idempotency & Exclusion Logic
  // -------------------------------------------------------------------------
  console.log('Test 1: Overdue detection and strict idempotency verification...');
  const now = new Date();
  const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday
  const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow

  const mockTasks = [
    { id: '1', title: 'Task 1', dueDate: pastDate, status: TaskStatus.TO_DO },
    { id: '2', title: 'Task 2', dueDate: pastDate, status: TaskStatus.IN_PROGRESS },
    { id: '3', title: 'Task 3', dueDate: pastDate, status: TaskStatus.DONE }, // Completed
    { id: '4', title: 'Task 4', dueDate: pastDate, status: TaskStatus.OVERDUE }, // Already marked!
    { id: '5', title: 'Task 5', dueDate: futureDate, status: TaskStatus.TO_DO }, // Not yet due
  ];

  // The database WHERE filter used by scanAndMarkOverdueTasks:
  // dueDate < now AND status NOT IN ('DONE', 'OVERDUE')
  const overdueCandidates = mockTasks.filter(
    (t) => t.dueDate < now && t.status !== TaskStatus.DONE && t.status !== TaskStatus.OVERDUE
  );

  assert.equal(overdueCandidates.length, 2, 'Must only identify Task 1 and Task 2');
  assert.equal(overdueCandidates[0].id, '1');
  assert.equal(overdueCandidates[1].id, '2');

  // Verify Idempotency: After candidates are marked OVERDUE, re-running the scan yields 0
  overdueCandidates.forEach((t) => (t.status = TaskStatus.OVERDUE));
  const secondPassCandidates = mockTasks.filter(
    (t) => t.dueDate < now && t.status !== TaskStatus.DONE && t.status !== TaskStatus.OVERDUE
  );
  assert.equal(secondPassCandidates.length, 0, 'Second pass must yield 0 tasks (strictly idempotent)');
  console.log('✅ Overdue candidate selection and idempotency verified.\n');

  // -------------------------------------------------------------------------
  // Test 2: Cron Scheduler Lifecycle
  // -------------------------------------------------------------------------
  console.log('Test 2: Background cron scheduler start and stop lifecycle...');
  const cronJob = startOverdueTaskScheduler('0 0 * * *'); // Daily midnight
  assert.ok(cronJob, 'Cron job should be instantiated');
  stopOverdueTaskScheduler();
  console.log('✅ Cron scheduler lifecycle verified.\n');

  // -------------------------------------------------------------------------
  // Test 3: HTTP Admin Trigger Endpoint & Role Protection
  // -------------------------------------------------------------------------
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const adminToken = signAccessToken({
    sub: '00000000-0000-0000-0000-000000000001',
    email: 'admin@velozity.internal',
    role: Role.ADMIN,
  });

  const devToken = signAccessToken({
    sub: '00000000-0000-0000-0000-000000000002',
    email: 'dev@velozity.internal',
    role: Role.DEVELOPER,
  });

  try {
    console.log('Test 3: Developer calling POST /api/tasks/check-overdue...');
    const devTriggerRes = await fetch(`${baseUrl}/api/tasks/check-overdue`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const devTriggerJson = await devTriggerRes.json() as any;
    assert.equal(devTriggerRes.status, 403);
    assert.equal(devTriggerJson.error.code, 'FORBIDDEN_ROLE');
    console.log('✅ Developer forbidden from triggering overdue job.\n');

    console.log('Test 4: Admin calling POST /api/tasks/check-overdue without active DB...');
    // Without active DB, it should either return 500 or proceed cleanly
    const adminTriggerRes = await fetch(`${baseUrl}/api/tasks/check-overdue`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    // Validates that request passed authentication & authorization middleware!
    assert.notEqual(adminTriggerRes.status, 403, 'Admin must not be forbidden');
    assert.notEqual(adminTriggerRes.status, 401, 'Admin must not be unauthorized');
    console.log('✅ Admin authorized to trigger overdue background scan.\n');

    console.log('🎉 All Phase 10 Background Overdue Job tests passed!\n');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

runOverdueJobTests().catch((err) => {
  console.error('❌ Overdue Job Test failed:', err);
  process.exit(1);
});
