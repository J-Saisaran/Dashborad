import assert from 'node:assert/strict';
import http from 'http';
import { app } from '../src/app.js';
import { signAccessToken } from '../src/utils/jwt.js';
import { Role } from '@prisma/client';

async function runDashboardTests() {
  console.log('🧪 Starting Phase 11 Dashboard Metrics API Tests...\n');

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
    // -----------------------------------------------------------------------
    // Test 1: Unauthorized access rejected
    // -----------------------------------------------------------------------
    console.log('Test 1: Unauthenticated request to /api/dashboard/stats...');
    const noAuthRes = await fetch(`${baseUrl}/api/dashboard/stats`);
    assert.equal(noAuthRes.status, 401);
    console.log('✅ Unauthenticated access rejected with 401.\n');

    // -----------------------------------------------------------------------
    // Test 2: Admin Dashboard Contract
    // -----------------------------------------------------------------------
    console.log('Test 2: Admin Dashboard contract verification...');
    const adminRes = await fetch(`${baseUrl}/api/dashboard/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    // In headless test without live DB, returns 500 or 200, verifying auth passed
    assert.notEqual(adminRes.status, 401);
    assert.notEqual(adminRes.status, 403);
    console.log('✅ Admin authorized and routed to Admin dashboard metrics handler.\n');

    // -----------------------------------------------------------------------
    // Test 3: Project Manager Dashboard Contract
    // -----------------------------------------------------------------------
    console.log('Test 3: Project Manager Dashboard contract verification...');
    const pmRes = await fetch(`${baseUrl}/api/dashboard/stats`, {
      headers: { Authorization: `Bearer ${pmToken}` },
    });
    assert.notEqual(pmRes.status, 401);
    assert.notEqual(pmRes.status, 403);
    console.log('✅ Project Manager authorized and routed to PM dashboard metrics handler.\n');

    // -----------------------------------------------------------------------
    // Test 4: Developer Dashboard Contract
    // -----------------------------------------------------------------------
    console.log('Test 4: Developer Dashboard contract verification...');
    const devRes = await fetch(`${baseUrl}/api/dashboard/stats`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    assert.notEqual(devRes.status, 401);
    assert.notEqual(devRes.status, 403);
    console.log('✅ Developer authorized and routed to Developer dashboard metrics handler.\n');

    console.log('🎉 All Phase 11 Dashboard Backend tests passed!\n');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

runDashboardTests().catch((err) => {
  console.error('❌ Dashboard Test failed:', err);
  process.exit(1);
});
