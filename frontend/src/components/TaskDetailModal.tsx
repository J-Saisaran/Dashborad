import React from 'react';
import { X, Calendar, User as UserIcon, Folder, Clock, CheckCircle2, Play } from 'lucide-react';
import type { Task, User, TaskStatus } from '../types/index.ts';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  currentUser: User;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  currentUser,
  onStatusChange,
}) => {
  if (!isOpen || !task) return null;

  const isDev = currentUser.role === 'DEVELOPER';

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '580px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span className="badge badge-priority-high">{task.priority}</span>
              <span className="badge badge-status-progress">{task.status.replace('_', ' ')}</span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              {task.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Description */}
          <div>
            <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, marginBottom: '0.35rem' }}>
              Description
            </div>
            <div
              style={{
                fontSize: '0.88rem',
                color: '#cbd5e1',
                lineHeight: 1.6,
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {task.description || 'No description provided for this task.'}
            </div>
          </div>

          {/* Metadata Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
              <Folder size={16} color="#818cf8" />
              <span>Project: <strong style={{ color: '#f8fafc' }}>{task.project?.name || 'Assigned Project'}</strong></span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
              <Calendar size={16} color="#f59e0b" />
              <span>Due: <strong style={{ color: '#f8fafc' }}>{new Date(task.dueDate).toLocaleDateString()}</strong></span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
              <UserIcon size={16} color="#10b981" />
              <span>Assignee: <strong style={{ color: '#f8fafc' }}>{task.assignedTo?.name || 'Unassigned'}</strong></span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
              <Clock size={16} color="#64748b" />
              <span>Created: <strong style={{ color: '#f8fafc' }}>{new Date(task.createdAt).toLocaleDateString()}</strong></span>
            </div>
          </div>

          {/* Quick status transition actions */}
          {isDev && onStatusChange && (
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              {task.status === 'TO_DO' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    onStatusChange(task.id, 'IN_PROGRESS');
                    onClose();
                  }}
                >
                  <Play size={14} />
                  <span>Start Working</span>
                </button>
              )}

              {task.status === 'IN_PROGRESS' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    onStatusChange(task.id, 'IN_REVIEW');
                    onClose();
                  }}
                  style={{ background: '#f59e0b', color: '#1e1b4b' }}
                >
                  <Clock size={14} />
                  <span>Submit for Review</span>
                </button>
              )}

              {task.status === 'IN_REVIEW' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    onStatusChange(task.id, 'DONE');
                    onClose();
                  }}
                  style={{ background: '#10b981' }}
                >
                  <CheckCircle2 size={14} />
                  <span>Mark as Done</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
