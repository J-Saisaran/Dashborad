import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  LogOut,
  Users,
  Wifi,
  WifiOff,
  CheckCircle2,
  Clock,
  Layers,
  ChevronDown
} from 'lucide-react';
import { useSocket } from '../context/SocketContext.tsx';
import { notificationApi } from '../api/client.ts';
import type { User, Notification } from '../types/index.ts';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  onQuickLogin?: (email: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout, onQuickLogin }) => {
  const { isConnected, onlineCount, unreadCount, setUnreadCount } = useSocket();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
        setShowAccountMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const res = await notificationApi.getNotifications();
      if (res.notifications) {
        setNotifications(res.notifications);
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleToggleNotifications = () => {
    const next = !showNotifications;
    setShowNotifications(next);
    if (next) {
      fetchNotifications();
    }
  };

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  const getRoleBadgeClass = () => {
    switch (user.role) {
      case 'ADMIN':
        return 'badge-role-admin';
      case 'PROJECT_MANAGER':
        return 'badge-role-pm';
      case 'DEVELOPER':
        return 'badge-role-dev';
      default:
        return '';
    }
  };

  return (
    <header className="header-nav" ref={dropdownRef}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)',
            }}
          >
            <Layers size={19} color="#ffffff" />
          </div>
          <div>
            <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em', color: '#f8fafc' }}>
              VELOZITY <span style={{ color: '#818cf8', fontWeight: 600 }}>OS</span>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '0.5rem' }}>
          {/* WebSocket Status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              color: isConnected ? '#10b981' : '#94a3b8',
              background: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(148, 163, 184, 0.2)'}`,
            }}
            title={isConnected ? 'Real-Time WebSocket Connected' : 'Connecting to WebSocket...'}
          >
            {isConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
            <span>{isConnected ? 'LIVE' : 'OFFLINE'}</span>
          </div>

          {/* Active Online Users (Real-Time Counter) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '9999px',
              padding: '0.2rem 0.65rem',
              fontSize: '0.78rem',
              color: '#e2e8f0',
            }}
            title="Real-time active users tracked via WebSockets"
          >
            <div className="pulse-dot" />
            <Users size={13} style={{ color: '#94a3b8' }} />
            <span>
              <strong>{onlineCount}</strong> online
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
        {/* Quick Demo Switcher - Strictly restricted to Admin */}
        {user.role === 'ADMIN' && onQuickLogin && (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <span>Switch Demo User</span>
              <ChevronDown size={13} />
            </button>
            {showAccountMenu && (
              <div
                className="glass-panel"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '230px',
                  padding: '0.5rem',
                  zIndex: 60,
                  background: '#111827',
                }}
              >
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', padding: '0.4rem 0.6rem', fontWeight: 700 }}>
                  Quick Demo Accounts
                </div>
                {[
                  { name: 'Admin (Sarah Connor)', email: 'admin@velozity.com', role: 'ADMIN' },
                  { name: 'PM 1 (John Miller)', email: 'pm1@velozity.com', role: 'PROJECT_MANAGER' },
                  { name: 'PM 2 (Elena Vance)', email: 'pm2@velozity.com', role: 'PROJECT_MANAGER' },
                  { name: 'Dev 1 (Alex Rivera)', email: 'dev1@velozity.com', role: 'DEVELOPER' },
                  { name: 'Dev 2 (David Chen)', email: 'dev2@velozity.com', role: 'DEVELOPER' },
                ].map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => {
                      setShowAccountMenu(false);
                      onQuickLogin(acc.email);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.45rem 0.6rem',
                      background: user.email === acc.email ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      color: user.email === acc.email ? '#a5b4fc' : '#e2e8f0',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{acc.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{acc.role}</div>
                    </div>
                    {user.email === acc.email && <CheckCircle2 size={14} color="#6366f1" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleToggleNotifications}
            style={{ position: 'relative', padding: '0.45rem 0.65rem' }}
            title="Notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '9999px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  minWidth: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="notification-dropdown">
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc' }}>
                  Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#818cf8',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                {loadingNotifications ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid var(--border-subtle)',
                        background: n.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.82rem', color: n.isRead ? '#cbd5e1' : '#ffffff' }}>
                          {n.title}
                        </span>
                        {!n.isRead && (
                          <button
                            type="button"
                            onClick={(e) => handleMarkRead(n.id, e)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#6366f1',
                              cursor: 'pointer',
                              padding: '2px',
                            }}
                            title="Mark as read"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                        {n.message}
                      </p>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={11} />
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
              {user.name}
            </span>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
              <span className={`badge ${getRoleBadgeClass()}`}>
                {user.role.replace('_', ' ')}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onLogout}
            title="Sign Out"
            style={{ padding: '0.45rem' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};
