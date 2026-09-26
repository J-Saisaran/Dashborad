import { PrismaClient, Role, TaskStatus, TaskPriority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Velozity OS Database Seed...');

  // 1. Clean existing records in reverse dependency order for idempotent seeding
  console.log('🧹 Cleaning existing records...');
  await prisma.refreshToken.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.activity.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Hash passwords
  console.log('🔐 Hashing default credentials...');
  const adminPasswordHash = await bcrypt.hash('AdminPass123!', 10);
  const pmPasswordHash = await bcrypt.hash('PmPass123!', 10);
  const devPasswordHash = await bcrypt.hash('DevPass123!', 10);
  const saranPasswordHash = await bcrypt.hash('Sansai#007', 10);

  // 3. Create Users (Admins, PMs, Developers)
  console.log('👤 Seeding Users...');
  const admin = await prisma.user.create({
    data: {
      name: 'Sarah Connor',
      email: 'admin@velozity.com',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Saran Sai',
      email: 'saransai027@gmail.com',
      passwordHash: saranPasswordHash,
      role: Role.ADMIN,
    },
  });

  const pm1 = await prisma.user.create({
    data: {
      name: 'John Miller',
      email: 'pm1@velozity.com',
      passwordHash: pmPasswordHash,
      role: Role.PROJECT_MANAGER,
    },
  });

  const pm2 = await prisma.user.create({
    data: {
      name: 'Elena Vance',
      email: 'pm2@velozity.com',
      passwordHash: pmPasswordHash,
      role: Role.PROJECT_MANAGER,
    },
  });

  const dev1 = await prisma.user.create({
    data: {
      name: 'Alex Rivera',
      email: 'dev1@velozity.com',
      passwordHash: devPasswordHash,
      role: Role.DEVELOPER,
    },
  });

  const dev2 = await prisma.user.create({
    data: {
      name: 'David Chen',
      email: 'dev2@velozity.com',
      passwordHash: devPasswordHash,
      role: Role.DEVELOPER,
    },
  });

  const dev3 = await prisma.user.create({
    data: {
      name: 'Maya Patel',
      email: 'dev3@velozity.com',
      passwordHash: devPasswordHash,
      role: Role.DEVELOPER,
    },
  });

  const dev4 = await prisma.user.create({
    data: {
      name: 'Marcus Brody',
      email: 'dev4@velozity.com',
      passwordHash: devPasswordHash,
      role: Role.DEVELOPER,
    },
  });

  // 4. Create Clients
  console.log('🏢 Seeding Clients...');
  const clientAcme = await prisma.client.create({
    data: {
      name: 'Arthur Pendelton',
      email: 'arthur@acmecorp.com',
      company: 'Acme Global Enterprises',
    },
  });

  const clientFintech = await prisma.client.create({
    data: {
      name: 'Sophia Sterling',
      email: 'sophia@fintechpulse.io',
      company: 'FinTech Pulse Labs',
    },
  });

  const clientHealth = await prisma.client.create({
    data: {
      name: 'Dr. Robert Lang',
      email: 'robert@healthsynapse.org',
      company: 'HealthSynapse Medical',
    },
  });

  // 5. Create Projects (>= 3 projects across clients and PMs)
  console.log('📁 Seeding Projects...');
  const project1 = await prisma.project.create({
    data: {
      name: 'NextGen Core Banking Gateway',
      description: 'High-throughput, distributed payment processing architecture with automated settlement engines.',
      clientId: clientFintech.id,
      ownerId: pm1.id,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'Omnichannel Logistics Portal',
      description: 'Real-time telemetry and fleet routing dashboard with automated inventory replenishment.',
      clientId: clientAcme.id,
      ownerId: pm1.id,
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: 'Clinical Trial Analytics Suite',
      description: 'HIPAA-compliant patient cohort data platform with multi-site audit capabilities.',
      clientId: clientHealth.id,
      ownerId: pm2.id,
    },
  });

  // Helper date generators
  const now = new Date();
  const pastDays = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
  const futureDays = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  // 6. Create Tasks (>= 5 tasks per project, total >= 15 tasks, >= 2 overdue)
  console.log('📝 Seeding Tasks...');

  // Project 1 Tasks (NextGen Core Banking Gateway)
  const task1_1 = await prisma.task.create({
    data: {
      title: 'Migrate legacy OAuth1 endpoints to mTLS',
      description: 'Enforce mutual TLS on all inbound client payment webhooks for PCI-DSS compliance.',
      status: TaskStatus.OVERDUE, // Overdue task #1
      priority: TaskPriority.CRITICAL,
      dueDate: pastDays(3),
      projectId: project1.id,
      assignedToId: dev1.id,
    },
  });

  const task1_2 = await prisma.task.create({
    data: {
      title: 'Implement idempotency keys on payment transactions',
      description: 'Guarantee exactly-once delivery semantics for transaction dispatch queue using Redis & PostgreSQL.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dueDate: futureDays(2),
      projectId: project1.id,
      assignedToId: dev1.id,
    },
  });

  const task1_3 = await prisma.task.create({
    data: {
      title: 'Ledger double-entry verification engine',
      description: 'Build atomic balance checking pipeline to prevent reconciliation discrepancies.',
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.HIGH,
      dueDate: futureDays(4),
      projectId: project1.id,
      assignedToId: dev2.id,
    },
  });

  const task1_4 = await prisma.task.create({
    data: {
      title: 'Setup Grafana metrics for p99 transaction latency',
      description: 'Instrument Prometheus counters and export histogram metrics for gateway response time.',
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      dueDate: pastDays(1),
      projectId: project1.id,
      assignedToId: dev3.id,
    },
  });

  const task1_5 = await prisma.task.create({
    data: {
      title: 'Automated AML sanction screening hook',
      description: 'Integrate real-time watchlist query before settlement dispatch.',
      status: TaskStatus.TO_DO,
      priority: TaskPriority.MEDIUM,
      dueDate: futureDays(7),
      projectId: project1.id,
      assignedToId: dev1.id,
    },
  });

  const task1_6 = await prisma.task.create({
    data: {
      title: 'Audit logging for manual override transactions',
      description: 'Require dual-authorization signatures for any manual journal adjustments.',
      status: TaskStatus.TO_DO,
      priority: TaskPriority.LOW,
      dueDate: futureDays(10),
      projectId: project1.id,
      assignedToId: dev4.id,
    },
  });

  // Project 2 Tasks (Omnichannel Logistics Portal)
  const task2_1 = await prisma.task.create({
    data: {
      title: 'Resolve database deadlocks in bulk order sync',
      description: 'Optimize index locking strategies on high-frequency warehouse inventory tables.',
      status: TaskStatus.OVERDUE, // Overdue task #2
      priority: TaskPriority.HIGH,
      dueDate: pastDays(5),
      projectId: project2.id,
      assignedToId: dev2.id,
    },
  });

  const task2_2 = await prisma.task.create({
    data: {
      title: 'Real-time vehicle GPS telemetry WebSocket ingestion',
      description: 'Ingest 5Hz fleet coordinates and compute ETA variations in real-time.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.CRITICAL,
      dueDate: futureDays(1),
      projectId: project2.id,
      assignedToId: dev2.id,
    },
  });

  const task2_3 = await prisma.task.create({
    data: {
      title: 'Warehouse barcode scanner offline cache',
      description: 'Implement local IndexedDB sync for handheld scanner terminals in dead zones.',
      status: TaskStatus.TO_DO,
      priority: TaskPriority.MEDIUM,
      dueDate: futureDays(5),
      projectId: project2.id,
      assignedToId: dev3.id,
    },
  });

  const task2_4 = await prisma.task.create({
    data: {
      title: 'Automated carrier rate calculation API',
      description: 'Fetch real-time dimensional weight quotes from FedEx, UPS, and DHL.',
      status: TaskStatus.DONE,
      priority: TaskPriority.LOW,
      dueDate: pastDays(2),
      projectId: project2.id,
      assignedToId: dev4.id,
    },
  });

  const task2_5 = await prisma.task.create({
    data: {
      title: 'Cold storage temperature excursion alerts',
      description: 'Trigger instant SMS notification if vaccine transit temperatures cross threshold.',
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.HIGH,
      dueDate: futureDays(3),
      projectId: project2.id,
      assignedToId: dev1.id,
    },
  });

  // Project 3 Tasks (Clinical Trial Analytics Suite)
  const task3_1 = await prisma.task.create({
    data: {
      title: 'HIPAA pseudonymization pipeline for EHR ingestion',
      description: 'De-identify patient records using Safe Harbor hashing before downstream ingestion.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.CRITICAL,
      dueDate: futureDays(3),
      projectId: project3.id,
      assignedToId: dev3.id,
    },
  });

  const task3_2 = await prisma.task.create({
    data: {
      title: 'Multi-center double-blind randomization algorithm',
      description: 'Implement block randomization seed generator for clinical trial drug assignments.',
      status: TaskStatus.TO_DO,
      priority: TaskPriority.HIGH,
      dueDate: futureDays(6),
      projectId: project3.id,
      assignedToId: dev4.id,
    },
  });

  const task3_3 = await prisma.task.create({
    data: {
      title: 'Adverse event reporting export module',
      description: 'Format clinical safety reports according to FDA MedWatch Form 3500A XML standard.',
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.MEDIUM,
      dueDate: futureDays(4),
      projectId: project3.id,
      assignedToId: dev3.id,
    },
  });

  const task3_4 = await prisma.task.create({
    data: {
      title: 'Consent withdrawal cascade protocol',
      description: 'Purge biomarker analysis caches within 24 hours of patient consent revocation.',
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      dueDate: pastDays(4),
      projectId: project3.id,
      assignedToId: dev4.id,
    },
  });

  const task3_5 = await prisma.task.create({
    data: {
      title: 'Audit trail cryptographic verification hashing',
      description: 'Chain tamper-evident SHA-256 block hashes on all investigator record edits.',
      status: TaskStatus.TO_DO,
      priority: TaskPriority.LOW,
      dueDate: futureDays(12),
      projectId: project3.id,
      assignedToId: dev2.id,
    },
  });

  // 7. Seed Persistent Activity Ledger Entries
  console.log('📜 Seeding Activity Ledger...');
  const activities = [
    {
      taskId: task1_1.id,
      projectId: project1.id,
      userId: dev1.id,
      previousStatus: 'IN_PROGRESS',
      newStatus: 'OVERDUE',
      summary: 'Task "Migrate legacy OAuth1 endpoints to mTLS" was automatically flagged as OVERDUE by the system background job.',
      createdAt: pastDays(1),
    },
    {
      taskId: task1_2.id,
      projectId: project1.id,
      userId: dev1.id,
      previousStatus: 'TO_DO',
      newStatus: 'IN_PROGRESS',
      summary: 'Alex Rivera transitioned task "Implement idempotency keys on payment transactions" from TO DO to IN PROGRESS.',
      createdAt: pastDays(2),
    },
    {
      taskId: task1_3.id,
      projectId: project1.id,
      userId: dev2.id,
      previousStatus: 'IN_PROGRESS',
      newStatus: 'IN_REVIEW',
      summary: 'David Chen submitted task "Ledger double-entry verification engine" for review (IN REVIEW).',
      createdAt: pastDays(1),
    },
    {
      taskId: task1_4.id,
      projectId: project1.id,
      userId: dev3.id,
      previousStatus: 'IN_REVIEW',
      newStatus: 'DONE',
      summary: 'Maya Patel completed task "Setup Grafana metrics for p99 transaction latency" (DONE).',
      createdAt: pastDays(1),
    },
    {
      taskId: task2_1.id,
      projectId: project2.id,
      userId: dev2.id,
      previousStatus: 'IN_PROGRESS',
      newStatus: 'OVERDUE',
      summary: 'Task "Resolve database deadlocks in bulk order sync" was automatically flagged as OVERDUE by the system background job.',
      createdAt: pastDays(2),
    },
    {
      taskId: task2_2.id,
      projectId: project2.id,
      userId: dev2.id,
      previousStatus: 'TO_DO',
      newStatus: 'IN_PROGRESS',
      summary: 'David Chen began working on "Real-time vehicle GPS telemetry WebSocket ingestion" (IN PROGRESS).',
      createdAt: pastDays(1),
    },
    {
      taskId: task2_5.id,
      projectId: project2.id,
      userId: dev1.id,
      previousStatus: 'IN_PROGRESS',
      newStatus: 'IN_REVIEW',
      summary: 'Alex Rivera submitted task "Cold storage temperature excursion alerts" for review (IN REVIEW).',
      createdAt: pastDays(1),
    },
    {
      taskId: task3_1.id,
      projectId: project3.id,
      userId: dev3.id,
      previousStatus: 'TO_DO',
      newStatus: 'IN_PROGRESS',
      summary: 'Maya Patel transitioned task "HIPAA pseudonymization pipeline for EHR ingestion" from TO DO to IN PROGRESS.',
      createdAt: pastDays(2),
    },
    {
      taskId: task3_3.id,
      projectId: project3.id,
      userId: dev3.id,
      previousStatus: 'IN_PROGRESS',
      newStatus: 'IN_REVIEW',
      summary: 'Maya Patel submitted task "Adverse event reporting export module" for PM review.',
      createdAt: pastDays(1),
    },
    {
      taskId: task3_4.id,
      projectId: project3.id,
      userId: dev4.id,
      previousStatus: 'IN_REVIEW',
      newStatus: 'DONE',
      summary: 'Marcus Brody completed task "Consent withdrawal cascade protocol" (DONE).',
      createdAt: pastDays(3),
    },
  ];

  for (const act of activities) {
    await prisma.activity.create({ data: act });
  }

  // 8. Seed In-App Notifications
  console.log('🔔 Seeding In-App Notifications...');
  const notifications = [
    {
      userId: dev1.id,
      taskId: task1_1.id,
      title: 'Critical Task Overdue',
      message: 'Task "Migrate legacy OAuth1 endpoints to mTLS" is past due and requires urgent remediation.',
      isRead: false,
      createdAt: pastDays(1),
    },
    {
      userId: dev1.id,
      taskId: task1_2.id,
      title: 'New Task Assignment',
      message: 'You have been assigned to task "Implement idempotency keys on payment transactions".',
      isRead: true,
      createdAt: pastDays(3),
    },
    {
      userId: pm1.id,
      taskId: task1_3.id,
      title: 'Task Awaiting Review',
      message: 'David Chen submitted "Ledger double-entry verification engine" for your approval.',
      isRead: false,
      createdAt: pastDays(1),
    },
    {
      userId: pm1.id,
      taskId: task2_5.id,
      title: 'Task Awaiting Review',
      message: 'Alex Rivera submitted "Cold storage temperature excursion alerts" for your approval.',
      isRead: false,
      createdAt: pastDays(1),
    },
    {
      userId: pm2.id,
      taskId: task3_3.id,
      title: 'Task Awaiting Review',
      message: 'Maya Patel submitted "Adverse event reporting export module" for your review.',
      isRead: false,
      createdAt: pastDays(1),
    },
    {
      userId: dev2.id,
      taskId: task2_1.id,
      title: 'High Priority Task Overdue',
      message: 'Task "Resolve database deadlocks in bulk order sync" is past due.',
      isRead: false,
      createdAt: pastDays(2),
    },
  ];

  for (const notif of notifications) {
    await prisma.notification.create({ data: notif });
  }

  console.log('✅ Database seeding complete!');
  console.log('----------------------------------------------------');
  console.log('Demo Credentials:');
  console.log('  Admin:  admin@velozity.com   / AdminPass123!');
  console.log('  PM 1:   pm1@velozity.com     / PmPass123!');
  console.log('  PM 2:   pm2@velozity.com     / PmPass123!');
  console.log('  Dev 1:  dev1@velozity.com    / DevPass123!');
  console.log('  Dev 2:  dev2@velozity.com    / DevPass123!');
  console.log('  Dev 3:  dev3@velozity.com    / DevPass123!');
  console.log('  Dev 4:  dev4@velozity.com    / DevPass123!');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
