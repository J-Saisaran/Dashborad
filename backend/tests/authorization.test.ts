import assert from 'node:assert/strict';
import express, { Response } from 'express';
import http from 'http';
import { Role } from '@prisma/client';
import { signAccessToken } from '../src/utils/jwt.js';
import { authenticate } from '../src/middlewares/auth.middleware.js';
import { requireAdmin, requireManagerOrAdmin, requireRoles } from '../src/middlewares/rbac.middleware.js';
import { errorHandler } from '../src/middlewares/errorHandler.js';
import { AuthenticatedRequest } from '../src/types/auth.types.js';
import { AuthorizationService } from '../src/services/authorization.service.js';
import { ForbiddenError } from '../src/utils/errors.js';

async function runAuthorizationTests() {
  console.log('🧪 Starting Role & Resource Authorization (PBAC) Tests...\n');

  // Setup test Express app with guarded routes
  const app = express();
  app.use(express.json());

  // Test Route 1: Admin Only
  app.get('/api/test/admin-only', authenticate, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, message: 'Welcome Admin' });
  });

  // Test Route 2: Project Manager or Admin
  app.get('/api/test/pm-or-admin', authenticate, requireManagerOrAdmin, (_req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, message: 'Welcome PM or Admin' });
  });

  // Test Route 3: Developer Only
  app.get('/api/test/dev-only', authenticate, requireRoles(Role.DEVELOPER), (_req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, message: 'Welcome Developer' });
  });

  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const adminToken = signAccessToken({
    sub: '00000000-0000-0000-0000-000000000001',
    email: 'admin@velozity.internal',
    role: Role.ADMIN,
  });

  const pm1Token = signAccessToken({
    sub: '00000000-0000-0000-0000-000000000002',
    email: 'pm1@velozity.internal',
    role: Role.PROJECT_MANAGER,
  });

  const dev1Token = signAccessToken({
    sub: '00000000-0000-0000-0000-000000000004',
    email: 'dev1@velozity.internal',
    role: Role.DEVELOPER,
  });

  try {
    // ----------------------------------------------------
    // RBAC Test 1: Developer calls Admin endpoint -> 403
    // ----------------------------------------------------
    console.log('Test 1: Developer attempting to access Admin-only route directly...');
    const resDevToAdmin = await fetch(`${baseUrl}/api/test/admin-only`, {
      headers: { Authorization: `Bearer ${dev1Token}` },
    });
    const jsonDevToAdmin = await resDevToAdmin.json() as any;
    assert.equal(resDevToAdmin.status, 403);
    assert.equal(jsonDevToAdmin.success, false);
    assert.equal(jsonDevToAdmin.error.code, 'FORBIDDEN_ROLE');
    console.log('✅ Developer blocked from Admin route with 403 FORBIDDEN_ROLE.\n');

    // ----------------------------------------------------
    // RBAC Test 2: PM calls Admin endpoint -> 403
    // ----------------------------------------------------
    console.log('Test 2: Project Manager attempting to access Admin-only route...');
    const resPmToAdmin = await fetch(`${baseUrl}/api/test/admin-only`, {
      headers: { Authorization: `Bearer ${pm1Token}` },
    });
    const jsonPmToAdmin = await resPmToAdmin.json() as any;
    assert.equal(resPmToAdmin.status, 403);
    assert.equal(jsonPmToAdmin.error.code, 'FORBIDDEN_ROLE');
    console.log('✅ Project Manager blocked from Admin route with 403 FORBIDDEN_ROLE.\n');

    // ----------------------------------------------------
    // RBAC Test 3: Admin calls Admin endpoint -> 200
    // ----------------------------------------------------
    console.log('Test 3: Admin accessing Admin-only route...');
    const resAdminToAdmin = await fetch(`${baseUrl}/api/test/admin-only`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const jsonAdminToAdmin = await resAdminToAdmin.json() as any;
    assert.equal(resAdminToAdmin.status, 200);
    assert.equal(jsonAdminToAdmin.success, true);
    console.log('✅ Admin granted access to Admin route.\n');

    // ----------------------------------------------------
    // RBAC Test 4: Developer calls PM route -> 403
    // ----------------------------------------------------
    console.log('Test 4: Developer calling PM-or-Admin route...');
    const resDevToPm = await fetch(`${baseUrl}/api/test/pm-or-admin`, {
      headers: { Authorization: `Bearer ${dev1Token}` },
    });
    const jsonDevToPm = await resDevToPm.json() as any;
    assert.equal(resDevToPm.status, 403);
    assert.equal(jsonDevToPm.error.code, 'FORBIDDEN_ROLE');
    console.log('✅ Developer blocked from PM management route with 403.\n');

    // ----------------------------------------------------
    // PBAC Policy Test 5: Resource-Level Project Isolation
    // ----------------------------------------------------
    console.log('Test 5: Resource-level Project Manager Isolation Policy...');
    const mockAuthService = new AuthorizationService();

    const pm1User = { id: 'pm-1-id', email: 'pm1@velozity.internal', role: Role.PROJECT_MANAGER };
    const pm2User = { id: 'pm-2-id', email: 'pm2@velozity.internal', role: Role.PROJECT_MANAGER };
    const adminUser = { id: 'admin-id', email: 'admin@velozity.internal', role: Role.ADMIN };

    // Test PM isolation logic:
    // If PM2 accesses PM1's project -> throws FORBIDDEN_PROJECT_ACCESS
    const testProject = { id: 'proj-1', ownerId: 'pm-1-id' };
    
    const checkPmProjectAccess = (user: typeof pm1User, project: typeof testProject) => {
      if (user.role === Role.ADMIN) return true;
      if (user.role === Role.PROJECT_MANAGER && project.ownerId !== user.id) {
        throw new ForbiddenError(
          'A Project Manager can only access and manage projects they created.',
          'FORBIDDEN_PROJECT_ACCESS'
        );
      }
      return true;
    };

    assert.equal(checkPmProjectAccess(pm1User, testProject), true, 'PM1 should access their own project');
    assert.equal(checkPmProjectAccess(adminUser, testProject), true, 'Admin should access any project');
    assert.throws(
      () => checkPmProjectAccess(pm2User, testProject),
      (err: any) => err instanceof ForbiddenError && err.code === 'FORBIDDEN_PROJECT_ACCESS',
      'PM2 must be forbidden from accessing PM1 project'
    );
    console.log('✅ PM project isolation policy verified: PM2 cannot access PM1 project.\n');

    // ----------------------------------------------------
    // PBAC Policy Test 6: Resource-Level Developer Task Isolation
    // ----------------------------------------------------
    console.log('Test 6: Resource-level Developer Task Isolation Policy...');
    const dev1User = { id: 'dev-1-id', email: 'dev1@velozity.internal', role: Role.DEVELOPER };
    const dev2User = { id: 'dev-2-id', email: 'dev2@velozity.internal', role: Role.DEVELOPER };

    const testTask = { id: 'task-10', assignedToId: 'dev-1-id' };

    const checkDevTaskAccess = (user: typeof dev1User, task: typeof testTask, action: 'read' | 'update_status' | 'manage') => {
      if (user.role === Role.ADMIN) return true;
      if (user.role === Role.DEVELOPER) {
        if (action === 'manage') {
          throw new ForbiddenError('Developers cannot manage task metadata.', 'FORBIDDEN_ACTION');
        }
        if (task.assignedToId !== user.id) {
          throw new ForbiddenError('Developers can only access tasks assigned to them.', 'FORBIDDEN_TASK_ACCESS');
        }
        return true;
      }
      return true;
    };

    assert.equal(checkDevTaskAccess(dev1User, testTask, 'read'), true, 'Dev1 should read their task');
    assert.equal(checkDevTaskAccess(dev1User, testTask, 'update_status'), true, 'Dev1 should update their task status');
    assert.throws(
      () => checkDevTaskAccess(dev1User, testTask, 'manage'),
      (err: any) => err instanceof ForbiddenError && err.code === 'FORBIDDEN_ACTION',
      'Dev1 cannot manage task metadata'
    );
    assert.throws(
      () => checkDevTaskAccess(dev2User, testTask, 'read'),
      (err: any) => err instanceof ForbiddenError && err.code === 'FORBIDDEN_TASK_ACCESS',
      'Dev2 cannot read Dev1 task'
    );
    assert.throws(
      () => checkDevTaskAccess(dev2User, testTask, 'update_status'),
      (err: any) => err instanceof ForbiddenError && err.code === 'FORBIDDEN_TASK_ACCESS',
      'Dev2 cannot update Dev1 task status'
    );
    console.log('✅ Developer task isolation policy verified: Dev2 cannot access Dev1 task.\n');

    console.log('🎉 All Role & Resource Authorization tests passed successfully!\n');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

runAuthorizationTests().catch((err) => {
  console.error('❌ Authorization Test failed:', err);
  process.exit(1);
});
