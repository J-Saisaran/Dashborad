import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  AlertOctagon,
  Calendar,
  FolderPlus,
  PlusCircle,
  Building,
  Clock
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

interface PMDashboardProps {
  user: User;
}

export const PMDashboard: React.FC<PMDashboardProps> = ({ user }) => {
  const { recentActivities, latestTaskUpdate, joinProject, leaveProject, requestCatchup } = useSocket();

  const [stats, setStats] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<TaskFilterParams>({});
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Modals
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
      // Join project room for WebSocket updates if projects exist
      if (projectsRes.projects && projectsRes.projects.length > 0) {
        projectsRes.projects.forEach((p: Project) => joinProject(p.id));
      }
    } catch (err) {
      console.error('Failed to load PM dashboard data', err);
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
    return () => {
      projects.forEach((p) => leaveProject(p.id));
    };
  }, []);

  useEffect(() => {
    loadTasks();
  }, [filters, selectedProjectId]);

  // Handle incoming real-time task update
  useEffect(() => {
    if (latestTaskUpdate) {
      setTasks((prev) =>
        prev.map((t) => (t.id === latestTaskUpdate.task.id ? latestTaskUpdate.task : t))
      );
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
      {/* PM Header & Quick Actions */}
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
            Project Manager Console
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '0.25rem' }}>
            Portfolio overview, sprint priority allocations, and team task deliverables.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsCreateProjectOpen(true)}
          >
            <FolderPlus size={16} />
            <span>Create Project</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsCreateTaskOpen(true)}
          >
            <PlusCircle size={16} />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* PM Metrics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* Managed Projects */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase' }}>
                My Projects
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.25rem' }}>
                {stats?.projectSummary?.totalProjects ?? projects.length}
              </div>
            </div>
            <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
              <Briefcase size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.75rem' }}>
            Projects under your management
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase' }}>
                Critical & High Priority
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.25rem' }}>
                {(stats?.tasksByPriority?.CRITICAL ?? 0) + (stats?.tasksByPriority?.HIGH ?? 0)}
              </div>
            </div>
            <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
              <AlertOctagon size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.75rem', display: 'flex', gap: '0.75rem' }}>
            <span>Crit: <strong style={{ color: '#f87171' }}>{stats?.tasksByPriority?.CRITICAL ?? 0}</strong></span>
            <span>High: <strong style={{ color: '#fbbf24' }}>{stats?.tasksByPriority?.HIGH ?? 0}</strong></span>
            <span>Med: <strong>{stats?.tasksByPriority?.MEDIUM ?? 0}</strong></span>
          </div>
        </div>

        {/* Upcoming Due Dates This Week */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase' }}>
                Due This Week
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#818cf8', marginTop: '0.25rem' }}>
                {stats?.upcomingDueDatesThisWeek?.length ?? 0}
              </div>
            </div>
            <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <Calendar size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#a5b4fc', marginTop: '0.75rem' }}>
            Deliverables due in the next 7 days
          </div>
        </div>

        {/* Overdue Tasks Count */}
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
              <Clock size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#fca5a5', marginTop: '0.75rem' }}>
            Requires immediate developer follow-up
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: Projects & Filterable Task List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Managed Projects List */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f8fafc' }}>
                My Managed Projects
              </div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{projects.length} Active</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.85rem' }}>
              {projects.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: '0.9rem',
                    borderRadius: '8px',
                    background: selectedProjectId === p.id ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    border: selectedProjectId === p.id ? '1px solid #8b5cf6' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease',
                  }}
                  onClick={() => setSelectedProjectId(selectedProjectId === p.id ? '' : p.id)}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc', marginBottom: '0.25rem' }}>
                    {p.name}
                  </div>
                  {p.client && (
                    <div style={{ fontSize: '0.78rem', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Building size={12} />
                      <span>{p.client.company}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b', marginTop: '0.5rem' }}>
                    <span>{p._count?.tasks ?? 0} tasks total</span>
                    <span style={{ color: '#818cf8' }}>Click to filter</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filterable Tasks */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f8fafc' }}>
                Task Assignment & Status Board
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

        {/* Right Column: Project Activities */}
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
