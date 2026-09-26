import React, { useState, useEffect } from 'react';
import { X, UserPlus, Shield, Briefcase, Code, Mail, Lock, User as UserIcon } from 'lucide-react';
import { userApi } from '../api/client.ts';
import type { Role } from '../types/index.ts';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated?: (user: any) => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onUserCreated,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('PROJECT_MANAGER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setEmail('');
      setPassword('');
      setRole('PROJECT_MANAGER');
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setError('Please provide name, email, and password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await userApi.createUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });

      setSuccessMessage(`Account for ${res.user.name} (${res.user.role}) created successfully!`);
      if (onUserCreated) {
        onUserCreated(res.user);
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to create user. Email may already be in use.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '1.75rem',
          position: 'relative',
          background: '#0d1321',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '9px',
                background: 'rgba(99, 102, 241, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818cf8',
              }}
            >
              <UserPlus size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                Provision Team Member
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                Register a new Admin, Project Manager, or Developer account
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.84rem',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        {successMessage && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              fontSize: '0.84rem',
              marginBottom: '1rem',
            }}
          >
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Full Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 500 }}>
              Full Name
            </label>
            <div style={{ position: 'relative' }}>
              <UserIcon size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: '#64748b' }} />
              <input
                type="text"
                className="input-control"
                style={{ paddingLeft: '2.4rem' }}
                placeholder="e.g. Rachel Adams"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 500 }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: '#64748b' }} />
              <input
                type="email"
                className="input-control"
                style={{ paddingLeft: '2.4rem' }}
                placeholder="rachel@velozity.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 500 }}>
              Password (min. 6 characters)
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: '#64748b' }} />
              <input
                type="password"
                className="input-control"
                style={{ paddingLeft: '2.4rem' }}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Role Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 500 }}>
              Privilege Level & Role
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setRole('PROJECT_MANAGER')}
                style={{
                  padding: '0.75rem 0.5rem',
                  borderRadius: '8px',
                  border: role === 'PROJECT_MANAGER' ? '2px solid #8b5cf6' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: role === 'PROJECT_MANAGER' ? 'rgba(139, 92, 246, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                  color: role === 'PROJECT_MANAGER' ? '#c4b5fd' : '#94a3b8',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                }}
              >
                <Briefcase size={18} color={role === 'PROJECT_MANAGER' ? '#a78bfa' : '#64748b'} />
                <span>Project Manager</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('DEVELOPER')}
                style={{
                  padding: '0.75rem 0.5rem',
                  borderRadius: '8px',
                  border: role === 'DEVELOPER' ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: role === 'DEVELOPER' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                  color: role === 'DEVELOPER' ? '#6ee7b7' : '#94a3b8',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                }}
              >
                <Code size={18} color={role === 'DEVELOPER' ? '#34d399' : '#64748b'} />
                <span>Developer</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('ADMIN')}
                style={{
                  padding: '0.75rem 0.5rem',
                  borderRadius: '8px',
                  border: role === 'ADMIN' ? '2px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: role === 'ADMIN' ? 'rgba(239, 68, 68, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                  color: role === 'ADMIN' ? '#fca5a5' : '#94a3b8',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                }}
              >
                <Shield size={18} color={role === 'ADMIN' ? '#f87171' : '#64748b'} />
                <span>Admin</span>
              </button>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.45rem' }}>
              {role === 'PROJECT_MANAGER' && '• Project Managers can create projects, assign tasks to developers, and manage their team.'}
              {role === 'DEVELOPER' && '• Developers can view their assigned tasks and update task statuses.'}
              {role === 'ADMIN' && '• Admins have complete system control across all clients, projects, tasks, and users.'}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <UserPlus size={16} />
              <span>{loading ? 'Creating User...' : 'Provision User'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
