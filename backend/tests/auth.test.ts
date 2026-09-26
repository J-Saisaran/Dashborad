import assert from 'node:assert/strict';
import { hashPassword, comparePassword, generateRandomToken, hashToken } from '../src/utils/crypto.js';
import { signAccessToken, verifyAccessToken } from '../src/utils/jwt.js';
import { Role } from '@prisma/client';
import { UnauthorizedError } from '../src/utils/errors.js';

async function runAuthTests() {
  console.log('🧪 Starting Auth Cryptographic & JWT Unit Tests...\n');

  // Test 1: Password hashing and verification
  console.log('Test 1: Password hashing and comparison...');
  const password = 'SuperSecretPassword123!';
  const hash = await hashPassword(password);
  assert.notEqual(password, hash, 'Hash must not equal plaintext');
  const isMatch = await comparePassword(password, hash);
  assert.equal(isMatch, true, 'Valid password must match hash');
  const isWrongMatch = await comparePassword('WrongPassword', hash);
  assert.equal(isWrongMatch, false, 'Invalid password must not match hash');
  console.log('✅ Password hashing passed.\n');

  // Test 2: Token generation and hashing
  console.log('Test 2: Refresh token generation and SHA-256 hashing...');
  const rawToken1 = generateRandomToken();
  const rawToken2 = generateRandomToken();
  assert.notEqual(rawToken1, rawToken2, 'Random tokens must be distinct');
  assert.equal(rawToken1.length, 128, 'Hex string of 64 bytes should be 128 chars');
  const hash1 = hashToken(rawToken1);
  const hash1Again = hashToken(rawToken1);
  assert.equal(hash1, hash1Again, 'SHA-256 hash must be deterministic');
  console.log('✅ Refresh token generation & hashing passed.\n');

  // Test 3: JWT signing and verification
  console.log('Test 3: Access token signing and verification...');
  const payload = {
    sub: '123e4567-e89b-12d3-a456-426614174000',
    email: 'admin@velozity.internal',
    role: Role.ADMIN,
  };
  const token = signAccessToken(payload);
  assert.ok(typeof token === 'string' && token.length > 20, 'Token must be a valid JWT string');

  const decoded = verifyAccessToken(token);
  assert.equal(decoded.sub, payload.sub, 'Subject UUID must match');
  assert.equal(decoded.email, payload.email, 'Email must match');
  assert.equal(decoded.role, Role.ADMIN, 'Role must match');
  console.log('✅ Access token signing & decoding passed.\n');

  // Test 4: Tampered JWT detection
  console.log('Test 4: Tampered JWT signature rejection...');
  const tamperedToken = token.slice(0, -5) + 'abcde';
  assert.throws(
    () => verifyAccessToken(tamperedToken),
    (err: any) => {
      return err instanceof UnauthorizedError && err.code === 'INVALID_TOKEN';
    },
    'Tampered token must be rejected with INVALID_TOKEN'
  );
  console.log('✅ Tampered token rejection passed.\n');

  console.log('🎉 All Auth cryptographic unit tests passed successfully!\n');
}

runAuthTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
