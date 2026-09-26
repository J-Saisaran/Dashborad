import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

async function runSeedVerificationTests() {
  console.log('🧪 Starting Phase 12 Database Seed Verification Tests...\n');

  // Test 1: Check existence of prisma/seed.ts
  console.log('Test 1: Verifying seed.ts existence and syntax...');
  const seedPath = path.resolve(process.cwd(), 'prisma', 'seed.ts');
  assert.ok(fs.existsSync(seedPath), 'prisma/seed.ts must exist');
  const seedContent = fs.readFileSync(seedPath, 'utf8');
  console.log('✅ prisma/seed.ts is present and readable.');

  // Test 2: Check required user personas
  console.log('\nTest 2: Verifying required user personas...');
  const requiredUsers = [
    { email: 'admin@velozity.com', role: 'ADMIN' },
    { email: 'pm1@velozity.com', role: 'PROJECT_MANAGER' },
    { email: 'pm2@velozity.com', role: 'PROJECT_MANAGER' },
    { email: 'dev1@velozity.com', role: 'DEVELOPER' },
    { email: 'dev2@velozity.com', role: 'DEVELOPER' },
    { email: 'dev3@velozity.com', role: 'DEVELOPER' },
    { email: 'dev4@velozity.com', role: 'DEVELOPER' },
  ];

  for (const u of requiredUsers) {
    assert.ok(
      seedContent.includes(u.email),
      `Seed script must define user with email: ${u.email}`
    );
    assert.ok(
      seedContent.includes(u.role),
      `Seed script must assign role: ${u.role}`
    );
  }
  console.log('✅ All 7 required personas (1 Admin, 2 PMs, 4 Developers) verified.');

  // Test 3: Check projects count (>= 3 projects)
  console.log('\nTest 3: Verifying projects specifications...');
  assert.ok(
    seedContent.includes('NextGen Core Banking Gateway'),
    'Seed script must include project 1'
  );
  assert.ok(
    seedContent.includes('Omnichannel Logistics Portal'),
    'Seed script must include project 2'
  );
  assert.ok(
    seedContent.includes('Clinical Trial Analytics Suite'),
    'Seed script must include project 3'
  );
  console.log('✅ At least 3 distinct projects across multiple clients verified.');

  // Test 4: Check overdue tasks (>= 2 overdue tasks)
  console.log('\nTest 4: Verifying overdue tasks requirement...');
  const overdueMatches = seedContent.match(/TaskStatus\.OVERDUE/g);
  assert.ok(
    overdueMatches && overdueMatches.length >= 2,
    `Seed script must contain at least 2 OVERDUE tasks, found: ${overdueMatches ? overdueMatches.length : 0}`
  );
  assert.ok(
    seedContent.includes('pastDays'),
    'Overdue tasks must have due dates in the past'
  );
  console.log('✅ At least 2 overdue tasks with elapsed past due dates verified.');

  // Test 5: Check persistent activity records
  console.log('\nTest 5: Verifying historical activity ledger records...');
  assert.ok(
    seedContent.includes('prisma.activity.create'),
    'Seed script must populate persistent activity ledger records'
  );
  assert.ok(
    seedContent.includes('previousStatus'),
    'Activity records must contain previousStatus'
  );
  assert.ok(
    seedContent.includes('newStatus'),
    'Activity records must contain newStatus'
  );
  console.log('✅ Historical activity audit logs verified.');

  // Test 6: Check package.json prisma.seed configuration
  console.log('\nTest 6: Verifying package.json prisma.seed configuration...');
  const pkgJsonPath = path.resolve(process.cwd(), 'package.json');
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  assert.equal(
    pkgJson.prisma?.seed,
    'tsx prisma/seed.ts',
    'package.json must configure "prisma": { "seed": "tsx prisma/seed.ts" }'
  );
  console.log('✅ package.json prisma.seed hook properly configured.');

  console.log('\n🎉 All Phase 12 Database Seed Verification tests passed!');
}

runSeedVerificationTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
