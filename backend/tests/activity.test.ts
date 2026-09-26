import assert from 'node:assert/strict';
import http from 'http';
import { app } from '../src/app.js';
import { signAccessToken } from '../src/utils/jwt.js';
import { Role } from '@prisma/client';
import { buildActivitySummary, formatRelativeTime, formatStatus } from '../src/utils/activityFormatter.js';

async function runActivityTests() {
  console.log('🧪 Starting Phase 6 Activity Logging Engine Tests...\n');

  // Test 1: Unit Test - Activity Summary Formatting
  console.log('Test 1: Activity summary string generation matching assessment spec...');
  const summary = buildActivitySummary('Ravi', 'Task #12', 'IN_PROGRESS', 'IN_REVIEW');
  assert.equal(summary, 'Ravi moved "Task #12" from In Progress → In Review');
  console.log(`✅ Formatted summary: "${summary}"\n`);

  // Test 2: Unit Test - Relative Time Formatter
  console.log('Test 2: Relative time formatting...');
  const now = new Date();
  assert.equal(formatRelativeTime(now), 'just now');

  const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000);
  assert.equal(formatRelativeTime(twoMinsAgo), '2 mins ago');

  const oneHourAgo = new Date(Date.now() - 65 * 60 * 1000);
  assert.equal(formatRelativeTime(oneHourAgo), '1 hour ago');

  const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);
  assert.equal(formatRelativeTime(yesterday), 'yesterday');
  console.log('✅ Relative time calculations verified.\n');

  // Test 3: HTTP API Tests
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
    // Test 3.1: Developer accessing global activity feed -> 403 FORBIDDEN_ROLE
    console.log('Test 3.1: Developer attempting GET /api/activities (Admin only)...');
    const devFeedRes = await fetch(`${baseUrl}/api/activities`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const devFeedJson = await devFeedRes.json() as any;
    assert.equal(devFeedRes.status, 403);
    assert.equal(devFeedJson.error.code, 'FORBIDDEN_ROLE');
    console.log('✅ Developer forbidden from global activity feed.\n');

    // Test 3.2: PM accessing global activity feed -> 403 FORBIDDEN_ROLE
    console.log('Test 3.2: PM attempting GET /api/activities (Admin only)...');
    const pmFeedRes = await fetch(`${baseUrl}/api/activities`, {
      headers: { Authorization: `Bearer ${pmToken}` },
    });
    const pmFeedJson = await pmFeedRes.json() as any;
    assert.equal(pmFeedRes.status, 403);
    assert.equal(pmFeedJson.error.code, 'FORBIDDEN_ROLE');
    console.log('✅ PM forbidden from global activity feed.\n');

    // Test 3.3: Invalid query parameters (limit > 100) -> 400 VALIDATION_ERROR
    console.log('Test 3.3: Query validation for limit > 100 on /api/activities?limit=150...');
    const badQueryRes = await fetch(`${baseUrl}/api/activities?limit=150`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const badQueryJson = await badQueryRes.json() as any;
    assert.equal(badQueryRes.status, 400);
    assert.equal(badQueryJson.error.code, 'VALIDATION_ERROR');
    console.log('✅ Activity query validator rejected excessive limit.\n');

    // Test 3.4: Invalid date format in before cursor -> 400 VALIDATION_ERROR
    console.log('Test 3.4: Query validation for malformed before cursor...');
    const badDateRes = await fetch(`${baseUrl}/api/activities?before=invalid-date`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const badDateJson = await badDateRes.json() as any;
    assert.equal(badDateRes.status, 400);
    assert.equal(badDateJson.error.code, 'VALIDATION_ERROR');
    console.log('✅ Activity query validator rejected malformed before cursor.\n');

    console.log('🎉 All Phase 6 Activity Logging tests passed!\n');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

runActivityTests().catch((err) => {
  console.error('❌ Activity Test failed:', err);
  process.exit(1);
});
