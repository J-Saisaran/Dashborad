import React, { useState } from 'react';
import { Layers, ShieldCheck, Briefcase, Code, Lock, Mail, ArrowRight, UserPlus, LogIn, User as UserIcon } from 'lucide-react';
import { authApi } from '../api/client.ts';
import type { User, Role } from '../types/index.ts';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('DEVELOPER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide email and password');
      return;
    }

    if (isRegisterMode && !name.trim()) {
      setError('Please provide your full name');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      if (isRegisterMode) {
        const res = await authApi.register({ name: name.trim(), email: email.trim(), password, role });
        onLoginSuccess(res.user);
      } else {
        const res = await authApi.login({ email: email.trim(), password });
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || `${isRegisterMode ? 'Registration' : 'Authentication'} failed. Please verify credentials.`);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
    setIsRegisterMode(false);
    try {
      setLoading(true);
      setError(null);
      const res = await authApi.login({ email: quickEmail, password: quickPass });
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #090d16 70%)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '460px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 30px rgba(99, 102, 241, 0.45)',
              marginBottom: '1rem',
            }}
          >
            <Layers size={28} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#f8fafc', margin: 0 }}>
            VELOZITY <span style={{ color: '#818cf8', fontWeight: 600 }}>OS</span>
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8', marginTop: '0.4rem' }}>
            Real-Time Client & Project Management Platform
          </p>
        </div>

        {/* Auth Box */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '4px',
              borderRadius: '10px',
              marginBottom: '1.5rem',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <button
              type="button"
              onClick={() => { setIsRegisterMode(false); setError(null); }}
              style={{
                flex: 1,
                padding: '0.55rem',
                border: 'none',
                borderRadius: '7px',
                background: !isRegisterMode ? '#6366f1' : 'transparent',
                color: !isRegisterMode ? '#ffffff' : '#94a3b8',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s',
              }}
            >
              <LogIn size={15} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => { setIsRegisterMode(true); setError(null); }}
              style={{
                flex: 1,
                padding: '0.55rem',
                border: 'none',
                borderRadius: '7px',
                background: isRegisterMode ? '#6366f1' : 'transparent',
                color: isRegisterMode ? '#ffffff' : '#94a3b8',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s',
              }}
            >
              <UserPlus size={15} />
              <span>Register</span>
            </button>
          </div>

          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '0.84rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {isRegisterMode && (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 500 }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <UserIcon size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
                  <input
                    type="text"
                    className="input-control"
                    style={{ paddingLeft: '2.4rem' }}
                    placeholder="Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 500 }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
                <input
                  type="email"
                  className="input-control"
                  style={{ paddingLeft: '2.4rem' }}
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 500 }}>
                Password {isRegisterMode && <span style={{ color: '#64748b', fontSize: '0.75rem' }}>(min. 6 chars)</span>}
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
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

            {isRegisterMode && (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 500 }}>
                  Account Role
                </label>
                <select
                  className="input-control"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="DEVELOPER">Developer (Task execution & status updates)</option>
                  <option value="PROJECT_MANAGER">Project Manager (Projects, tasks, assignments)</option>
                  <option value="ADMIN">Admin (Full platform & user access)</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ marginTop: '0.5rem', width: '100%', padding: '0.75rem', fontSize: '0.92rem' }}
            >
              <span>{loading ? (isRegisterMode ? 'Creating Account...' : 'Authenticating...') : (isRegisterMode ? 'Create Account & Enter' : 'Sign In')}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        </div>

        {/* 1-Click Evaluation Personas */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#818cf8', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '0.85rem' }}>
            ⚡ 1-Click Assessment Personas
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleQuickLogin('admin@velozity.com', 'AdminPass123!')}
              disabled={loading}
              style={{ justifyContent: 'space-between', padding: '0.55rem 0.85rem', fontSize: '0.8rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={16} color="#ef4444" />
                <span style={{ fontWeight: 600 }}>Admin (Sarah Connor)</span>
              </div>
              <span className="badge badge-role-admin">Admin</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleQuickLogin('pm1@velozity.com', 'PmPass123!')}
              disabled={loading}
              style={{ justifyContent: 'space-between', padding: '0.55rem 0.85rem', fontSize: '0.8rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Briefcase size={16} color="#8b5cf6" />
                <span style={{ fontWeight: 600 }}>PM 1 (John Miller)</span>
              </div>
              <span className="badge badge-role-pm">Manager</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleQuickLogin('pm2@velozity.com', 'PmPass123!')}
              disabled={loading}
              style={{ justifyContent: 'space-between', padding: '0.55rem 0.85rem', fontSize: '0.8rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Briefcase size={16} color="#8b5cf6" />
                <span style={{ fontWeight: 600 }}>PM 2 (Elena Vance)</span>
              </div>
              <span className="badge badge-role-pm">Manager</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleQuickLogin('dev1@velozity.com', 'DevPass123!')}
              disabled={loading}
              style={{ justifyContent: 'space-between', padding: '0.55rem 0.85rem', fontSize: '0.8rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Code size={16} color="#10b981" />
                <span style={{ fontWeight: 600 }}>Dev 1 (Alex Rivera)</span>
              </div>
              <span className="badge badge-role-dev">Developer</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleQuickLogin('dev2@velozity.com', 'DevPass123!')}
              disabled={loading}
              style={{ justifyContent: 'space-between', padding: '0.55rem 0.85rem', fontSize: '0.8rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Code size={16} color="#10b981" />
                <span style={{ fontWeight: 600 }}>Dev 2 (David Chen)</span>
              </div>
              <span className="badge badge-role-dev">Developer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
