import assert from 'node:assert/strict';
import http from 'http';
import { app } from '../src/app.js';
import { signAccessToken } from '../src/utils/jwt.js';
import { Role } from '@prisma/client';

async function runApiAuthTests() {
  console.log('🧪 Starting Auth HTTP Endpoints Integration Tests...\n');

  // Start test server on dynamic OS port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // Test 1: Validation error on missing login fields
    console.log('Test 1: POST /api/auth/login with invalid payload...');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    });
    const loginJson = await loginRes.json() as any;
    assert.equal(loginRes.status, 400, 'Expected 400 Bad Request');
    assert.equal(loginJson.success, false);
    assert.equal(loginJson.error.code, 'VALIDATION_ERROR');
    console.log('✅ Validation error handled with structured JSON format.\n');

    // Test 2: Refresh endpoint without cookie
    console.log('Test 2: POST /api/auth/refresh with missing cookie...');
    const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
    });
    const refreshJson = await refreshRes.json() as any;
    assert.equal(refreshRes.status, 401, 'Expected 401 Unauthorized');
    assert.equal(refreshJson.success, false);
    assert.equal(refreshJson.error.code, 'REFRESH_TOKEN_REQUIRED');
    console.log('✅ Missing refresh token cookie rejected properly.\n');

    // Test 3: Protected endpoint without Authorization header
    console.log('Test 3: GET /api/auth/me with missing Authorization header...');
    const meResNoAuth = await fetch(`${baseUrl}/api/auth/me`);
    const meJsonNoAuth = await meResNoAuth.json() as any;
    assert.equal(meResNoAuth.status, 401, 'Expected 401 Unauthorized');
    assert.equal(meJsonNoAuth.success, false);
    assert.equal(meJsonNoAuth.error.code, 'MISSING_TOKEN');
    console.log('✅ Missing bearer token rejected.\n');

    // Test 4: Protected endpoint with tampered token
    console.log('Test 4: GET /api/auth/me with tampered token...');
    const validToken = signAccessToken({
      sub: '00000000-0000-0000-0000-000000000001',
      email: 'dev@velozity.internal',
      role: Role.DEVELOPER,
    });
    const meResTampered = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${validToken}tampered` },
    });
    const meJsonTampered = await meResTampered.json() as any;
    assert.equal(meResTampered.status, 401);
    assert.equal(meJsonTampered.error.code, 'INVALID_TOKEN');
    console.log('✅ Tampered bearer token rejected with INVALID_TOKEN.\n');

    console.log('🎉 All Auth API integration tests passed!\n');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

runApiAuthTests().catch((err) => {
  console.error('❌ API Test failed:', err);
  process.exit(1);
});
