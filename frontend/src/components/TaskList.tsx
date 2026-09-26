import React from 'react';
import {
  Calendar,
  AlertCircle,
  Play,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  Folder,
  ArrowRight
} from 'lucide-react';
import type { Task, User, TaskStatus } from '../types/index.ts';

interface TaskListProps {
  tasks: Task[];
  currentUser: User;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onViewTask?: (task: Task) => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  currentUser,
  onStatusChange,
  onEditTask,
  onDeleteTask,
  onViewTask,
}) => {
  const isDev = currentUser.role === 'DEVELOPER';
  const isManagerOrAdmin = currentUser.role === 'PROJECT_MANAGER' || currentUser.role === 'ADMIN';

  const getStatusBadgeClass = (status: TaskStatus) => {
    switch (status) {
      case 'TO_DO':
        return 'badge-status-todo';
      case 'IN_PROGRESS':
        return 'badge-status-progress';
      case 'IN_REVIEW':
        return 'badge-status-review';
      case 'DONE':
        return 'badge-status-done';
      case 'OVERDUE':
        return 'badge-status-overdue';
      default:
        return '';
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'badge-priority-critical';
      case 'HIGH':
        return 'badge-priority-high';
      case 'MEDIUM':
        return 'badge-priority-medium';
      case 'LOW':
        return 'badge-priority-low';
      default:
        return '';
    }
  };

  if (tasks.length === 0) {
    return (
      <div
        className="glass-panel"
        style={{
          padding: '3rem 2rem',
          textAlign: 'center',
          color: '#94a3b8',
        }}
      >
        <AlertCircle size={36} style={{ margin: '0 auto 0.75rem', color: '#64748b' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.25rem' }}>
          No tasks found
        </h3>
        <p style={{ fontSize: '0.85rem' }}>
          Try adjusting your filter criteria or creating a new task.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {tasks.map((task) => {
        const isPastDue = new Date(task.dueDate) < new Date() && task.status !== 'DONE';

        return (
          <div
            key={task.id}
            className="glass-panel"
            style={{
              padding: '1.1rem 1.35rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              borderLeft:
                task.status === 'OVERDUE' || isPastDue
                  ? '3px solid #ef4444'
                  : task.priority === 'CRITICAL'
                  ? '3px solid #f87171'
                  : '1px solid var(--border-subtle)',
              transition: 'transform 0.15s ease, background 0.15s ease',
            }}
          >
            {/* Task Info */}
            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    color: '#f8fafc',
                    cursor: onViewTask ? 'pointer' : 'default',
                  }}
                  onClick={() => onViewTask?.(task)}
                >
                  {task.title}
                </span>

                <span className={`badge ${getStatusBadgeClass(task.status)}`}>
                  {task.status.replace('_', ' ')}
                </span>

                <span className={`badge ${getPriorityBadgeClass(task.priority)}`}>
                  {task.priority}
                </span>
              </div>

              {task.description && (
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                  {task.description.length > 140
                    ? `${task.description.slice(0, 140)}...`
                    : task.description}
                </p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.76rem', color: '#64748b', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                {task.project && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#818cf8' }}>
                    <Folder size={12} />
                    {task.project.name}
                  </span>
                )}

                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    color: task.status === 'OVERDUE' || isPastDue ? '#f87171' : '#94a3b8',
                    fontWeight: task.status === 'OVERDUE' || isPastDue ? 600 : 400,
                  }}
                >
                  <Calendar size={12} />
                  Due: {new Date(task.dueDate).toLocaleDateString()}
                  {(task.status === 'OVERDUE' || isPastDue) && ' (Overdue)'}
                </span>

                {task.assignedTo && (
                  <span style={{ color: '#cbd5e1' }}>
                    Assigned to: <strong>{task.assignedTo.name}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {/* Developer Status Progression Buttons */}
              {isDev && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {task.status === 'TO_DO' && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => onStatusChange(task.id, 'IN_PROGRESS')}
                      style={{ background: '#3b82f6' }}
                    >
                      <Play size={13} />
                      <span>Start Working</span>
                    </button>
                  )}

                  {task.status === 'IN_PROGRESS' && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => onStatusChange(task.id, 'IN_REVIEW')}
                      style={{ background: '#f59e0b', color: '#1e1b4b' }}
                    >
                      <Clock size={13} />
                      <span>Submit for Review</span>
                    </button>
                  )}

                  {task.status === 'IN_REVIEW' && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => onStatusChange(task.id, 'DONE')}
                      style={{ background: '#10b981' }}
                    >
                      <CheckCircle2 size={13} />
                      <span>Mark as Done</span>
                    </button>
                  )}

                  {task.status === 'OVERDUE' && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => onStatusChange(task.id, 'IN_PROGRESS')}
                    >
                      <ArrowRight size={13} />
                      <span>Resume Task</span>
                    </button>
                  )}
                </div>
              )}

              {/* Manager & Admin Status Quick Selector & Edit/Delete */}
              {isManagerOrAdmin && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <select
                    aria-label="Change status"
                    className="input-control"
                    value={task.status}
                    onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
                    style={{
                      width: 'auto',
                      padding: '0.3rem 0.5rem',
                      fontSize: '0.78rem',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <option value="TO_DO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="DONE">Done</option>
                    <option value="OVERDUE">Overdue</option>
                  </select>

                  {onEditTask && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onEditTask(task)}
                      title="Edit Task"
                      style={{ padding: '0.35rem 0.5rem' }}
                    >
                      <Edit2 size={13} />
                    </button>
                  )}

                  {onDeleteTask && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
                          onDeleteTask(task.id);
                        }
                      }}
                      title="Delete Task"
                      style={{ padding: '0.35rem 0.5rem', color: '#f87171' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
