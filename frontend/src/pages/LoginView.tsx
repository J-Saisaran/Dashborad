import React, { useState } from 'react';
import { Layers, ShieldCheck, Briefcase, Code, Lock, Mail, ArrowRight } from 'lucide-react';
import { authApi } from '../api/client.ts';
import type { User } from '../types/index.ts';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await authApi.login({ email, password });
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
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

        {/* Login Box */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
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
                Password
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

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ marginTop: '0.5rem', width: '100%', padding: '0.75rem', fontSize: '0.92rem' }}
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
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
