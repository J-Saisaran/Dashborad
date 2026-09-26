import assert from 'node:assert/strict';
import http from 'http';
import { app } from '../src/app.js';
import { signAccessToken } from '../src/utils/jwt.js';
import { Role, TaskPriority, TaskStatus } from '@prisma/client';
import { PRIORITY_WEIGHTS } from '../src/services/task.service.js';

async function runPhase5Tests() {
  console.log('🧪 Starting Phase 5 Client, Project & Task API Tests...\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const adminToken = signAccessToken({
    sub: '00000000-0000-0000-0000-000000000001',
    email: 'admin@velozity.internal',
    role: Role.ADMIN,
  });

  const pmToken = signAccessToken({
    sub: '00000000-0000-0000-0000-000000000002',
    email: 'pm@velozity.internal',
    role: Role.PROJECT_MANAGER,
  });

  const devToken = signAccessToken({
    sub: '00000000-0000-0000-0000-000000000003',
    email: 'dev@velozity.internal',
    role: Role.DEVELOPER,
  });

  try {
    // ------------------------------------------------------------------
    // Test 1: Developer blocked from Client creation (Admin only)
    // ------------------------------------------------------------------
    console.log('Test 1: Developer attempting POST /api/clients...');
    const clientDevRes = await fetch(`${baseUrl}/api/clients`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${devToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Acme', email: 'acme@test.com', company: 'Acme Corp' }),
    });
    const clientDevJson = await clientDevRes.json() as any;
    assert.equal(clientDevRes.status, 403);
    assert.equal(clientDevJson.error.code, 'FORBIDDEN_ROLE');
    console.log('✅ Developer successfully forbidden from Client API.\n');

    // ------------------------------------------------------------------
    // Test 2: PM blocked from Client creation (Admin only)
    // ------------------------------------------------------------------
    console.log('Test 2: Project Manager attempting POST /api/clients...');
    const clientPmRes = await fetch(`${baseUrl}/api/clients`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pmToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Acme', email: 'acme@test.com', company: 'Acme Corp' }),
    });
    const clientPmJson = await clientPmRes.json() as any;
    assert.equal(clientPmRes.status, 403);
    assert.equal(clientPmJson.error.code, 'FORBIDDEN_ROLE');
    console.log('✅ Project Manager successfully forbidden from Client API.\n');

    // ------------------------------------------------------------------
    // Test 3: Admin calling POST /api/clients with invalid body -> 400
    // ------------------------------------------------------------------
    console.log('Test 3: Admin POST /api/clients with invalid body...');
    const clientBadRes = await fetch(`${baseUrl}/api/clients`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'A' }), // Missing email, company, name too short
    });
    const clientBadJson = await clientBadRes.json() as any;
    assert.equal(clientBadRes.status, 400);
    assert.equal(clientBadJson.error.code, 'VALIDATION_ERROR');
    assert.ok(clientBadJson.error.details.length >= 2);
    console.log('✅ Client creation validation error formatted correctly.\n');

    // ------------------------------------------------------------------
    // Test 4: Developer blocked from Project creation
    // ------------------------------------------------------------------
    console.log('Test 4: Developer attempting POST /api/projects...');
    const projDevRes = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${devToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Secret Project',
        clientId: '00000000-0000-0000-0000-000000000010',
      }),
    });
    const projDevJson = await projDevRes.json() as any;
    assert.equal(projDevRes.status, 403);
    assert.equal(projDevJson.error.code, 'FORBIDDEN_ROLE');
    console.log('✅ Developer forbidden from Project creation.\n');

    // ------------------------------------------------------------------
    // Test 5: Developer blocked from Task creation
    // ------------------------------------------------------------------
    console.log('Test 5: Developer attempting POST /api/projects/:id/tasks...');
    const taskDevRes = await fetch(`${baseUrl}/api/projects/00000000-0000-0000-0000-000000000020/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${devToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Unauthorized Task',
        priority: 'HIGH',
        dueDate: new Date().toISOString(),
      }),
    });
    const taskDevJson = await taskDevRes.json() as any;
    assert.equal(taskDevRes.status, 403);
    assert.equal(taskDevJson.error.code, 'FORBIDDEN_ROLE');
    console.log('✅ Developer forbidden from Task creation.\n');

    // ------------------------------------------------------------------
    // Test 6: Task status transition invalid input
    // ------------------------------------------------------------------
    console.log('Test 6: PATCH /api/tasks/:id/status with invalid status value...');
    const statusBadRes = await fetch(`${baseUrl}/api/tasks/00000000-0000-0000-0000-000000000030/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${devToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'NOT_A_VALID_STATUS' }),
    });
    const statusBadJson = await statusBadRes.json() as any;
    assert.equal(statusBadRes.status, 400);
    assert.equal(statusBadJson.error.code, 'VALIDATION_ERROR');
    console.log('✅ Task status transition rejects invalid enum values with 400.\n');

    // ------------------------------------------------------------------
    // Test 7: Unit Test: Priority Sorting (CRITICAL > HIGH > MEDIUM > LOW)
    // ------------------------------------------------------------------
    console.log('Test 7: Priority-then-due-date sorting algorithm test...');
    const now = Date.now();
    const mockTasks = [
      { id: '1', priority: TaskPriority.LOW, dueDate: new Date(now + 1000) },
      { id: '2', priority: TaskPriority.CRITICAL, dueDate: new Date(now + 5000) },
      { id: '3', priority: TaskPriority.HIGH, dueDate: new Date(now + 2000) },
      { id: '4', priority: TaskPriority.HIGH, dueDate: new Date(now + 1000) }, // Earlier High
      { id: '5', priority: TaskPriority.MEDIUM, dueDate: new Date(now + 3000) },
    ];

    const sorted = [...mockTasks].sort((a, b) => {
      const weightDiff = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
      if (weightDiff !== 0) return weightDiff;
      return a.dueDate.getTime() - b.dueDate.getTime();
    });

    assert.equal(sorted[0].id, '2', 'CRITICAL task should be first');
    assert.equal(sorted[1].id, '4', 'Earlier HIGH task should be second');
    assert.equal(sorted[2].id, '3', 'Later HIGH task should be third');
    assert.equal(sorted[3].id, '5', 'MEDIUM task should be fourth');
    assert.equal(sorted[4].id, '1', 'LOW task should be last');
    console.log('✅ Priority-then-due-date sorting algorithm verified.\n');

    console.log('🎉 All Phase 5 API & validation tests passed!\n');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

runPhase5Tests().catch((err) => {
  console.error('❌ Phase 5 Test failed:', err);
  process.exit(1);
});
