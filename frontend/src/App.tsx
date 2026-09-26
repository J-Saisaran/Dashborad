import React, { useState, useEffect } from 'react';
import { SocketProvider } from './context/SocketContext.tsx';
import { authApi } from './api/client.ts';
import { Navbar } from './components/Navbar.tsx';
import { LoginView } from './pages/LoginView.tsx';
import { AdminDashboard } from './pages/AdminDashboard.tsx';
import { PMDashboard } from './pages/PMDashboard.tsx';
import { DeveloperDashboard } from './pages/DeveloperDashboard.tsx';
import type { User } from './types/index.ts';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check existing session on startup
  useEffect(() => {
    authApi
      .getMe()
      .then((res) => {
        if (res.user) {
          setUser(res.user);
        }
      })
      .catch(() => {
        // Not authenticated
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      setUser(null);
    }
  };

  const handleQuickLogin = async (email: string) => {
    let password = 'DevPass123!';
    if (email.includes('admin')) password = 'AdminPass123!';
    else if (email.includes('pm')) password = 'PmPass123!';

    try {
      setLoading(true);
      const res = await authApi.login({ email, password });
      setUser(res.user);
    } catch (err) {
      console.error('Quick login error', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-main)',
          color: '#818cf8',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div className="pulse-dot" style={{ width: '16px', height: '16px' }} />
        <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Initializing Velozity OS...</span>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  return (
    <SocketProvider user={user}>
      <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
        <Navbar
          user={user}
          onLogout={handleLogout}
          onQuickLogin={handleQuickLogin}
        />

        <main>
          {user.role === 'ADMIN' && <AdminDashboard user={user} />}
          {user.role === 'PROJECT_MANAGER' && <PMDashboard user={user} />}
          {user.role === 'DEVELOPER' && <DeveloperDashboard user={user} />}
        </main>
      </div>
    </SocketProvider>
  );
};

export default App;
