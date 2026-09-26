# Velozity Global Solutions Technical Hiring Assessment
## Real-Time Client Project Dashboard ("Velozity OS")

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.x-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF.svg)](https://vite.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748.svg)](https://www.prisma.io/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8-black.svg)](https://socket.io/)
[![Security: PBAC](https://img.shields.io/badge/Security-PBAC%20%2B%20RBAC-red.svg)](https://csrc.nist.gov/publications/detail/sp/800-162/final)

A production-grade, real-time client and project management platform built to satisfy all specifications of the **Velozity Global Solutions Technical Assessment**.

---

## Table of Contents
1. [Core Architectural Invariants](#1-core-architectural-invariants)
2. [System Architecture](#2-system-architecture)
3. [Database Schema & ERD](#3-database-schema--erd)
4. [Role & Authorization Matrix (PBAC)](#4-role--authorization-matrix-pbac)
5. [Evaluation Personas & Default Credentials](#5-evaluation-personas--default-credentials)
6. [Quick Start & Installation](#6-quick-start--installation)
7. [REST API Documentation](#7-rest-api-documentation)
8. [WebSocket Protocol Specification](#8-websocket-protocol-specification)
9. [Background Jobs & Schedulers](#9-background-jobs--schedulers)
10. [Test Suite Verification](#10-test-suite-verification)

---

## 1. Core Architectural Invariants

This system is engineered strictly around the core requirements and security rules outlined in the technical assessment:

1. **Role-Based and Ownership-Based Access Control (PBAC)**:
   - `Admin`: Unrestricted organizational access across all clients, projects, tasks, and system metrics.
   - `Project Manager`: Scoped exclusively to projects they own/manage and the team tasks within those projects.
   - `Developer`: Scoped strictly to their own assigned tasks.
   - **IDOR Prevention Invariant**: Developers are strictly blocked from PM data and unassigned project workspaces even if their JWT tokens are modified or manipulated.
2. **Dual-Token Authentication Lifecycle**:
   - Short-lived Access Token stored **strictly in-memory** on the client (never persisted in `localStorage` or `sessionStorage`).
   - Long-lived Refresh Token stored exclusively in an **`HttpOnly`, `SameSite=Strict` cookie**.
   - SHA-256 hashed refresh token storage in PostgreSQL with automatic rotation and token reuse detection (revokes token family if compromise is detected).
3. **Persistent Activity Ledger**:
   - Task status transitions are committed atomically within a PostgreSQL `$transaction` creating an immutable `Activity` record.
   - Audit trail records are **never derived dynamically** or on-the-fly.
4. **Strict Real-Time WebSockets (No Polling, No SSE)**:
   - WebSockets are configured with native transport (`transports: ['websocket']`).
   - HTTP polling and Server-Sent Events (SSE) are completely omitted.
   - Real-time multi-tab presence deduplication ensures multiple browser tabs for the same user only increment the active user counter once.
5. **Missed-Event Recovery Protocol**:
   - On reconnect, clients retrieve up to the last 20 missed activity events directly from PostgreSQL using the composite index `idx_activities_project_recent`.
   - No volatile in-memory message caches are used.
6. **Background Overdue Task Scheduler**:
   - Scheduled background worker (`node-cron`) scans tasks where `dueDate < NOW()` and `status NOT IN ('DONE', 'OVERDUE')`.
   - Overdue tasks are updated in the database, logged in the activity ledger, and broadcast in real-time over WebSockets without requiring user page visits.

---

## 2. System Architecture

```mermaid
flowchart TD
    subgraph Client ["Client Browser (React 19 + TypeScript + Vite)"]
        UI["Glassmorphic UI / Filterable Task Board"]
        MemAuth["In-Memory Access Token"]
        CookieStore["HttpOnly Cookie (Refresh Token)"]
        SocketClient["Socket.io Client (Strictly WebSockets)"]
    end

    subgraph Backend ["Backend Service (Node.js + Express + TypeScript)"]
        APIGateway["Express Router & Centralized Error Handler"]
        AuthMiddleware["JWT Authenticate + RBAC / PBAC Guard"]
        Controllers["Controllers & Zod Validators"]
        Services["Domain Services (Task, Project, Activity, Auth)"]
        OverdueCron["node-cron (Scheduled Overdue Scanner)"]
        SocketServer["Socket.io Server (Rooms & Handshake Auth)"]
        Presence["PresenceManager (Multi-tab Deduplication)"]
    end

    subgraph Database ["PostgreSQL 16"]
        PrismaORM["Prisma Client"]
        Tables[("users\nclients\nprojects\ntasks\nactivities\nnotifications\nrefresh_tokens")]
    end

    UI -->|REST API with Bearer Token| APIGateway
    CookieStore -->|Auto Refresh /auth/refresh| APIGateway
    SocketClient -->|WebSocket Handshake with Token| SocketServer
    APIGateway --> AuthMiddleware --> Controllers --> Services --> PrismaORM --> Tables
    OverdueCron -->|Periodic Scan| Services
    Services -->|Broadcast Status / Notifications| SocketServer
    SocketServer --> Presence
    SocketServer -->|Live Broadcasts / Catchup| SocketClient
```

---

## 3. Database Schema & ERD

The database schema is fully normalized and managed via Prisma ORM:

```mermaid
erDiagram
    User ||--o{ Project : "owns (PM)"
    User ||--o{ Task : "assigned to (Dev)"
    User ||--o{ Activity : "performs"
    User ||--o{ Notification : "receives"
    User ||--o{ RefreshToken : "holds"

    Client ||--o{ Project : "commissions"
    Project ||--o{ Task : "contains"
    Project ||--o{ Activity : "tracks"
    Task ||--o{ Activity : "generates"
    Task ||--o{ Notification : "triggers"

    User {
        uuid id PK
        string email UK
        string passwordHash
        string name
        enum role "ADMIN | PROJECT_MANAGER | DEVELOPER"
        datetime createdAt
        datetime updatedAt
    }

    Client {
        uuid id PK
        string name
        string email
        string company
        datetime createdAt
        datetime updatedAt
    }

    Project {
        uuid id PK
        string name
        string description
        uuid clientId FK
        uuid ownerId FK
        datetime createdAt
        datetime updatedAt
    }

    Task {
        uuid id PK
        string title
        string description
        enum status "TO_DO | IN_PROGRESS | IN_REVIEW | DONE | OVERDUE"
        enum priority "LOW | MEDIUM | HIGH | CRITICAL"
        datetime dueDate
        uuid projectId FK
        uuid assignedToId FK
        datetime createdAt
        datetime updatedAt
    }

    Activity {
        uuid id PK
        uuid taskId FK
        uuid projectId FK
        uuid userId FK
        string previousStatus
        string newStatus
        string summary
        datetime createdAt
    }

    Notification {
        uuid id PK
        uuid userId FK
        uuid taskId FK
        string title
        string message
        boolean isRead
        datetime createdAt
    }

    RefreshToken {
        uuid id PK
        string tokenHash UK
        uuid userId FK
        datetime expiresAt
        boolean isRevoked
        datetime createdAt
    }
```

### Strategic Compound Indexes
- `idx_tasks_filters` on `(status, priority, dueDate)` for instant multi-facet task queries.
- `idx_tasks_overdue_scan` on `(dueDate, status)` for sub-millisecond cron scan execution.
- `idx_activities_project_recent` on `(projectId, createdAt DESC)` for 20-event reconnect recovery.
- `idx_notifications_user_unread` on `(userId, isRead, createdAt DESC)` for unread count badge queries.
- `idx_refresh_tokens_hash` on `(tokenHash)` for token rotation lookup.

---

## 4. Role & Authorization Matrix (PBAC)

| Resource / Action | Admin | Project Manager | Developer |
|---|:---:|:---:|:---:|
| **View System Metrics** | Full Access | Scoped to Owned Projects | Scoped to Assigned Tasks |
| **Manage Clients** | Full Access | Create & Read Only | Blocked (`403 Forbidden`) |
| **Create Project** | Yes | Yes | Blocked (`403 Forbidden`) |
| **Edit/Delete Project** | Yes | Owned Projects Only | Blocked (`403 Forbidden`) |
| **Create/Delete Tasks** | Yes | In Owned Projects | Blocked (`403 Forbidden`) |
| **Assign Developer to Task** | Yes | In Owned Projects | Blocked (`403 Forbidden`) |
| **View Tasks** | All Tasks | In Owned Projects | Assigned Tasks Only |
| **Update Task Status** | Any Task | In Owned Projects | Assigned Tasks Only (`To Do` $\to$ `In Progress` $\to$ `In Review` $\to$ `Done`) |
| **Trigger Overdue Scan** | Yes (`POST /api/tasks/check-overdue`) | Blocked (`403 Forbidden`) | Blocked (`403 Forbidden`) |
| **WebSocket Project Feed** | Any Project | Owned Projects | Assigned Projects Only |

---

## 5. Evaluation Personas & Default Credentials

The database is pre-seeded with 7 evaluation accounts matching all roles and workflows:

| Persona | Role | Email | Password | Scope & Responsibilities |
|---|---|---|---|---|
| **Sarah Connor** | `ADMIN` | `admin@velozity.com` | `AdminPass123!` | Global organization overview, system-wide metrics, active online user counter |
| **John Miller** | `PROJECT_MANAGER` | `pm1@velozity.com` | `PmPass123!` | Manages Core Banking & Logistics portfolios, assigns tasks, verifies deliverables |
| **Elena Vance** | `PROJECT_MANAGER` | `pm2@velozity.com` | `PmPass123!` | Manages Clinical Trial Analytics portfolio |
| **Alex Rivera** | `DEVELOPER` | `dev1@velozity.com` | `DevPass123!` | Assigned to Core Banking mTLS (Overdue) & Payment Transactions |
| **David Chen** | `DEVELOPER` | `dev2@velozity.com` | `DevPass123!` | Assigned to Bulk Order Deadlocks (Overdue) & GPS Telemetry |
| **Maya Patel** | `DEVELOPER` | `dev3@velozity.com` | `DevPass123!` | Assigned to EHR Pseudonymization & Latency Metrics |
| **Marcus Brody** | `DEVELOPER` | `dev4@velozity.com` | `DevPass123!` | Assigned to Carrier Rate API & Randomization Algorithms |

> **Tip**: The frontend includes a **1-Click Quick Demo Login Switcher** on both the login screen and the navigation bar for instant testing of all personas.

---

## 6. Quick Start & Installation

### Option A: Using Docker Compose (Recommended)

1. **Clone and Configure Environment**:
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```

2. **Start PostgreSQL 16 via Docker**:
   ```bash
   docker-compose up -d
   ```

3. **Install Dependencies**:
   ```bash
   npm run install:all
   ```

4. **Run Migrations & Seed Data**:
   ```bash
   npm run prisma:migrate
   npm run prisma:seed
   ```

5. **Start Development Servers**:
   - Backend (Port 5000): `npm run dev:backend`
   - Frontend (Port 5173): `npm run dev:frontend`

Visit `http://localhost:5173` in your browser.

---

### Option B: Local PostgreSQL Setup

1. Ensure a PostgreSQL instance is running on `localhost:5432` with database `velozity_dashboard`.
2. Configure `backend/.env` with your PostgreSQL credentials:
   ```env
   DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/velozity_dashboard?schema=public"
   ```
3. Run migrations, seed database, and start servers:
   ```bash
   npm --prefix backend run prisma:migrate
   npm --prefix backend run prisma:seed
   npm run dev:backend
   npm run dev:frontend
   ```

---

## 7. REST API Documentation

Base URL: `http://localhost:5000/api`

### Authentication (`/auth`)
- `POST /auth/login` - Authenticate with email & password. Returns access token in JSON and sets `HttpOnly` refresh token cookie.
- `POST /auth/refresh` - Silently rotate refresh token via `HttpOnly` cookie and return a new access token.
- `POST /auth/logout` - Revoke current refresh token and clear cookie.
- `GET /auth/me` - Retrieve current authenticated user profile.

### Dashboard Metrics (`/dashboard`)
- `GET /dashboard/stats` - Retrieve role-scoped dashboard metrics:
  - Admin: Total projects, task breakdown by status, overdue task count, active online users.
  - PM: Owned projects, task breakdown by priority, upcoming due dates this week, overdue count.
  - Developer: Total assigned tasks, tasks by status, sorted by priority and due date.

### Clients (`/clients`)
- `GET /clients` - List clients with project counts (Admin & PM).
- `POST /clients` - Create a new client record (Admin & PM).

### Projects (`/projects`)
- `GET /projects` - List projects (role-scoped, paginated, filterable by client).
- `POST /projects` - Create a new project (Admin & PM).
- `GET /projects/:id` - Get project details with owner & client information.
- `PATCH /projects/:id` - Update project details (Owner PM or Admin only).
- `DELETE /projects/:id` - Delete project (Owner PM or Admin only).
- `GET /projects/:id/activities` - Retrieve project activity audit ledger.
- `GET /projects/:id/activities/missed?since=<ISO>` - Catch-up missed events (last 20 records).

### Tasks (`/tasks`)
- `GET /tasks` - Filterable query parameters: `projectId`, `status`, `priority`, `dueDateFrom`, `dueDateTo`, `assignedToId`.
- `POST /tasks` - Create a task with priority, due date, project, and assignee (Admin & PM).
- `GET /tasks/:id` - Get task details (authorized users only).
- `PATCH /tasks/:id` - Edit task properties or reassign developer.
- `PATCH /tasks/:id/status` - Transition task status (`TO_DO` $\to$ `IN_PROGRESS` $\to$ `IN_REVIEW` $\to$ `DONE`). Atomically commits activity log and notifies stakeholders.
- `DELETE /tasks/:id` - Delete task (Owner PM or Admin only).
- `POST /tasks/check-overdue` - Manually trigger background overdue scan (Admin only).

### In-App Notifications (`/notifications`)
- `GET /notifications?unreadOnly=true` - List user notifications.
- `PATCH /notifications/:id/read` - Mark specific notification as read.
- `PATCH /notifications/read-all` - Mark all notifications as read.

---

## 8. WebSocket Protocol Specification

WebSocket URL: `ws://localhost:5000` (Socket.io with `transports: ['websocket']`)

### Handshake Authentication
Connect with the in-memory access token passed in the auth payload:
```javascript
const socket = io('http://localhost:5000', {
  transports: ['websocket'],
  auth: { token: inMemoryAccessToken },
});
```

### Client-to-Server Events
- `project:join` `{ projectId: string }`: Join a project room to receive live task and activity broadcasts.
- `project:leave` `{ projectId: string }`: Leave project room.
- `activity:catchup` `{ projectId: string, since?: string }`: Request last 20 missed events from PostgreSQL. Callback returns `{ success: true, data: { activities } }`.

### Server-to-Client Events
- `presence:update` `{ onlineCount: number }`: Real-time online users counter broadcasted to Admin room upon connection/disconnection.
- `notification:new` `{ notification: Notification }`: Sent to `user:<userId>` when assigned a task or requested for review.
- `notification:unread_count` `{ unreadCount: number }`: Real-time unread badge counter push without polling.
- `task:status_changed` `{ task: Task, previousStatus: string, newStatus: string }`: Broadcasted to project room viewers.
- `activity:new` `{ activity: Activity }`: Broadcasted to project room viewers and global Admin feed.

---

## 9. Background Jobs & Schedulers

### Overdue Task Detection Worker (`backend/src/jobs/overdueTask.job.ts`)
- Configured using `node-cron`.
- Default schedule: Runs periodically in the background (`* * * * *` in development, configurable for production).
- **Idempotent Scan**: Queries tasks where `dueDate < NOW()` and `status NOT IN ('DONE', 'OVERDUE')`.
- **Atomic Operations**:
  - Updates task status to `OVERDUE`.
  - Commits persistent `Activity` record in PostgreSQL.
  - Broadcasts `task:status_changed` and `activity:new` WebSocket events.
  - Emits in-app notifications to assigned developers and project owners.

---

## 10. Test Suite Verification

The repository features **13 automated test suites** covering all 14 phases of the technical specification:

```bash
# Run all 13 backend test suites
npm test

# Or run individual test phases
npm run test:auth      # Phase 3: JWT & HttpOnly refresh token rotation
npm run test:authz     # Phase 4: PBAC & RBAC authorization
npm run test:phase5    # Phase 5: Client, Project & Task APIs
npm run test:phase6    # Phase 6: Atomic activity ledger transactions
npm run test:phase7    # Phase 7: WebSocket presence & multi-tab deduplication
npm run test:phase8    # Phase 8: PostgreSQL 20-event missed recovery
npm run test:phase9    # Phase 9: Real-time notification dispatch
npm run test:phase10   # Phase 10: Background overdue job scheduler
npm run test:phase11   # Phase 11: Dashboard metrics contracts
npm run test:phase12   # Phase 12: Database seed verification
npm run test:e2e       # Phase 13: End-to-end security & IDOR blocking

# Build and verify frontend production bundle
npm run build:frontend
```

All 13 test suites execute and pass with **0 errors**.
