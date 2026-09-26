import React, { useState, useEffect } from 'react';
import {
  Folder,
  CheckCircle,
  AlertTriangle,
  Users,
  FolderPlus,
  PlusCircle,
  Building
} from 'lucide-react';
import { useSocket } from '../context/SocketContext.tsx';
import { dashboardApi, projectApi, taskApi } from '../api/client.ts';
import { TaskFilterBar } from '../components/TaskFilterBar.tsx';
import { TaskList } from '../components/TaskList.tsx';
import { ActivityFeed } from '../components/ActivityFeed.tsx';
import { CreateProjectModal } from '../components/CreateProjectModal.tsx';
import { CreateTaskModal } from '../components/CreateTaskModal.tsx';
import { EditTaskModal } from '../components/EditTaskModal.tsx';
import { TaskDetailModal } from '../components/TaskDetailModal.tsx';
import type { User, Project, Task, TaskFilterParams, TaskStatus } from '../types/index.ts';

interface AdminDashboardProps {
  user: User;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const { onlineCount, recentActivities, latestTaskUpdate, requestCatchup } = useSocket();

  const [stats, setStats] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<TaskFilterParams>({});
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Modals state
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  const [isDetailTaskOpen, setIsDetailTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, projectsRes] = await Promise.all([
        dashboardApi.getStats(),
        projectApi.getProjects({ limit: 100 }),
      ]);
      setStats(statsRes.stats);
      setProjects(projectsRes.projects || []);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const taskParams: Record<string, any> = { ...filters };
      if (selectedProjectId) {
        taskParams.projectId = selectedProjectId;
      }
      const res = await taskApi.getTasks(taskParams);
      setTasks(res.tasks || []);
    } catch (err) {
      console.error('Failed to load tasks', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [filters, selectedProjectId]);

  // Real-time task update listener from WebSocket
  useEffect(() => {
    if (latestTaskUpdate) {
      setTasks((prev) =>
        prev.map((t) => (t.id === latestTaskUpdate.task.id ? latestTaskUpdate.task : t))
      );
      // Reload stats to keep counters accurate
      dashboardApi.getStats().then((res) => setStats(res.stats)).catch(() => {});
    }
  }, [latestTaskUpdate]);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const res = await taskApi.updateTask(taskId, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)));
      dashboardApi.getStats().then((res) => setStats(res.stats)).catch(() => {});
    } catch (err: any) {
      alert(err.message || 'Failed to update task status');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await taskApi.deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      dashboardApi.getStats().then((res) => setStats(res.stats)).catch(() => {});
    } catch (err: any) {
      alert(err.message || 'Failed to delete task');
    }
  };

  const handleCatchup = async () => {
    if (projects.length > 0) {
      await requestCatchup(projects[0].id);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.75rem' }}>
      {/* Top Header & Quick Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', margin: 0 }}>
            Enterprise System Overview
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '0.25rem' }}>
            System-wide projects, real-time activity ledger, and cross-team task status.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsCreateProjectOpen(true)}
          >
            <FolderPlus size={16} />
            <span>New Project</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsCreateTaskOpen(true)}
          >
            <PlusCircle size={16} />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* Total Projects */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase' }}>
                Total Projects
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.25rem' }}>
                {stats?.totalProjects ?? projects.length}
              </div>
            </div>
            <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <Folder size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.75rem' }}>
            Active client workspaces
          </div>
        </div>

        {/* Tasks by Status Breakdown */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase' }}>
                Tasks Completed
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>
                {stats?.tasksByStatus?.DONE ?? 0}
              </div>
            </div>
            <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <CheckCircle size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.75rem', display: 'flex', gap: '0.75rem' }}>
            <span>To Do: <strong>{stats?.tasksByStatus?.TO_DO ?? 0}</strong></span>
            <span>In Prog: <strong>{stats?.tasksByStatus?.IN_PROGRESS ?? 0}</strong></span>
            <span>Review: <strong>{stats?.tasksByStatus?.IN_REVIEW ?? 0}</strong></span>
          </div>
        </div>

        {/* Overdue Tasks Alert Card */}
        <div
          className="glass-panel"
          style={{
            padding: '1.25rem',
            border: stats?.overdueTaskCount > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-subtle)',
            background: stats?.overdueTaskCount > 0 ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#f87171', fontWeight: 600, textTransform: 'uppercase' }}>
                Overdue Tasks
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444', marginTop: '0.25rem' }}>
                {stats?.overdueTaskCount ?? 0}
              </div>
            </div>
            <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
              <AlertTriangle size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#fca5a5', marginTop: '0.75rem' }}>
            {stats?.overdueTaskCount > 0 ? 'Detected by Overdue Task Job' : 'No overdue tasks'}
          </div>
        </div>

        {/* Active Online Users (Live WebSocket Counter) */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase' }}>
                Active Online Users
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="pulse-dot" />
                <span>{onlineCount}</span>
              </div>
            </div>
            <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <Users size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.75rem' }}>
            Real-time multi-tab presence
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Projects & Tasks, Right = Activity Stream */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Projects Overview List */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f8fafc' }}>
                All Projects & Clients
              </div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{projects.length} Total</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.85rem' }}>
              {projects.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: '0.9rem',
                    borderRadius: '8px',
                    background: selectedProjectId === p.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    border: selectedProjectId === p.id ? '1px solid #6366f1' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease',
                  }}
                  onClick={() => setSelectedProjectId(selectedProjectId === p.id ? '' : p.id)}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc', marginBottom: '0.25rem' }}>
                    {p.name}
                  </div>
                  {p.client && (
                    <div style={{ fontSize: '0.78rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Building size={12} />
                      <span>{p.client.company}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b', marginTop: '0.5rem' }}>
                    <span>Owner: {p.owner?.name || 'Assigned PM'}</span>
                    <span>{p._count?.tasks ?? 0} tasks</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filterable Tasks Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f8fafc' }}>
                Task Ledger & Operations
              </div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} found
              </span>
            </div>

            <TaskFilterBar
              filters={filters}
              onFilterChange={setFilters}
              showProjectFilter={true}
              projects={projects}
              selectedProjectId={selectedProjectId}
              onProjectChange={setSelectedProjectId}
            />

            <TaskList
              tasks={tasks}
              currentUser={user}
              onStatusChange={handleStatusChange}
              onEditTask={(task) => {
                setSelectedTask(task);
                setIsEditTaskOpen(true);
              }}
              onDeleteTask={handleDeleteTask}
              onViewTask={(task) => {
                setSelectedTask(task);
                setIsDetailTaskOpen(true);
              }}
            />
          </div>
        </div>

        {/* Right Column: Activity Stream */}
        <div style={{ position: 'sticky', top: '5.5rem' }}>
          <ActivityFeed
            activities={recentActivities}
            onRefresh={handleCatchup}
            isLoading={loading}
          />
        </div>
      </div>

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onProjectCreated={(newProject) => {
          setProjects((prev) => [newProject, ...prev]);
          loadData();
        }}
      />

      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onTaskCreated={(newTask) => {
          setTasks((prev) => [newTask, ...prev]);
          loadData();
        }}
        projects={projects}
        defaultProjectId={selectedProjectId}
      />

      <EditTaskModal
        isOpen={isEditTaskOpen}
        onClose={() => {
          setIsEditTaskOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        onTaskUpdated={(updated) => {
          setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          loadData();
        }}
      />

      <TaskDetailModal
        isOpen={isDetailTaskOpen}
        onClose={() => {
          setIsDetailTaskOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        currentUser={user}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};
