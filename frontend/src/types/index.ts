export type Role = 'ADMIN' | 'PROJECT_MANAGER' | 'DEVELOPER';

export type TaskStatus = 'TO_DO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'OVERDUE';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
  createdAt: string;
  _count?: { projects: number };
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  clientId: string;
  ownerId: string;
  createdAt: string;
  client?: Client;
  owner?: User;
  _count?: { tasks: number };
  tasks?: Task[];
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  projectId: string;
  assignedToId?: string | null;
  createdAt: string;
  project?: { id: string; name: string };
  assignedTo?: User | null;
}

export interface Activity {
  id: string;
  taskId: string;
  projectId: string;
  userId: string;
  previousStatus: string;
  newStatus: string;
  summary: string;
  createdAt: string;
  relativeTime?: string;
  displayMessage?: string;
  user?: User;
  task?: { id: string; title: string; priority: TaskPriority };
}

export interface Notification {
  id: string;
  userId: string;
  taskId?: string | null;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  task?: { id: string; title: string; priority: TaskPriority } | null;
}

export interface DashboardStats {
  role: Role;
  totalProjects?: number;
  tasksByStatus?: Record<string, number>;
  overdueTaskCount?: number;
  activeUsersOnline?: number;
  projectSummary?: { totalProjects: number; projects: Project[] };
  tasksByPriority?: Record<string, number>;
  upcomingDueDatesThisWeek?: Task[];
  totalAssignedTasks?: number;
  assignedTasks?: Task[];
}

export interface TaskFilterParams {
  status?: string;
  priority?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
}
