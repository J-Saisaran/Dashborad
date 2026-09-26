import React, { useState, useEffect } from 'react';
import {
  Code,
  CheckCircle,
  PlayCircle,
  Clock,
  Folder
} from 'lucide-react';
import { useSocket } from '../context/SocketContext.tsx';
import { dashboardApi, taskApi } from '../api/client.ts';
import { TaskFilterBar } from '../components/TaskFilterBar.tsx';
import { TaskList } from '../components/TaskList.tsx';
import { TaskDetailModal } from '../components/TaskDetailModal.tsx';
import type { User, Task, TaskFilterParams, TaskStatus } from '../types/index.ts';

interface DeveloperDashboardProps {
  user: User;
}

export const DeveloperDashboard: React.FC<DeveloperDashboardProps> = ({ user }) => {
  const { latestTaskUpdate } = useSocket();

  const [stats, setStats] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<TaskFilterParams>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const statsRes = await dashboardApi.getStats();
      setStats(statsRes.stats);
    } catch (err) {
      console.error('Failed to load developer stats', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      // Backend automatically scopes GET /api/tasks to req.user.id for DEVELOPER role!
      const res = await taskApi.getTasks(filters as any);
      setTasks(res.tasks || []);
    } catch (err) {
      console.error('Failed to load assigned tasks', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [filters]);

  // Real-time task update listener
  useEffect(() => {
    if (latestTaskUpdate) {
      // Only update if it belongs to this developer or was just assigned/unassigned
      setTasks((prev) => {
        const exists = prev.some((t) => t.id === latestTaskUpdate.task.id);
        if (exists) {
          return prev.map((t) => (t.id === latestTaskUpdate.task.id ? latestTaskUpdate.task : t));
        }
        // If newly assigned to this developer
        if (latestTaskUpdate.task.assignedToId === user.id) {
          return [latestTaskUpdate.task, ...prev];
        }
        return prev;
      });
      dashboardApi.getStats().then((res) => setStats(res.stats)).catch(() => {});
    }
  }, [latestTaskUpdate, user.id]);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const res = await taskApi.updateTask(taskId, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)));
      dashboardApi.getStats().then((res) => setStats(res.stats)).catch(() => {});
    } catch (err: any) {
      alert(err.message || 'Failed to update task status');
    }
  };

  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const inReviewCount = tasks.filter((t) => t.status === 'IN_REVIEW').length;
  const doneCount = tasks.filter((t) => t.status === 'DONE').length;
  const overdueCount = tasks.filter((t) => t.status === 'OVERDUE').length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.75rem' }}>
      {/* Developer Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              padding: '0.45rem',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
            }}
          >
            <Code size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', margin: 0 }}>
              Developer Sprint Workbench
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '0.2rem' }}>
              Your assigned tasks, sorted by priority (Critical &gt; High &gt; Medium &gt; Low) and due date.
            </p>
          </div>
        </div>
      </div>

      {/* Developer Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* Total Assigned */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase' }}>
                Assigned Tasks
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.25rem' }}>
                {stats?.totalAssignedTasks ?? tasks.length}
              </div>
            </div>
            <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <Folder size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.75rem' }}>
            Scoped to your user profile
          </div>
        </div>

        {/* In Progress */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase' }}>
                In Progress
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#60a5fa', marginTop: '0.25rem' }}>
                {inProgressCount}
              </div>
            </div>
            <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
              <PlayCircle size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#93c5fd', marginTop: '0.75rem' }}>
            Active development items
          </div>
        </div>

        {/* In Review */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase' }}>
                In Review
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.25rem' }}>
                {inReviewCount}
              </div>
            </div>
            <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
              <Clock size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#fde68a', marginTop: '0.75rem' }}>
            Awaiting PM verification
          </div>
        </div>

        {/* Done / Overdue */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase' }}>
                Completed
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>
                {doneCount}
              </div>
            </div>
            <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <CheckCircle size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: overdueCount > 0 ? '#f87171' : '#6ee7b7', marginTop: '0.75rem' }}>
            {overdueCount > 0 ? `${overdueCount} task(s) currently overdue` : 'All tasks up to date'}
          </div>
        </div>
      </div>

      {/* Filterable Task List */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f8fafc' }}>
            My Assigned Tasks
          </div>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>

        <TaskFilterBar
          filters={filters}
          onFilterChange={setFilters}
          showProjectFilter={false}
        />

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
            Loading assigned tasks...
          </div>
        ) : (
          <TaskList
            tasks={tasks}
            currentUser={user}
            onStatusChange={handleStatusChange}
            onViewTask={(task) => {
              setSelectedTask(task);
              setIsDetailModalOpen(true);
            }}
          />
        )}
      </div>

      {/* Detail Modal */}
      <TaskDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        currentUser={user}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};
