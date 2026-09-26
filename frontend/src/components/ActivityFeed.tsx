import React, { useState } from 'react';
import { Activity as ActivityIcon, Clock, RefreshCw } from 'lucide-react';
import type { Activity } from '../types/index.ts';

interface ActivityFeedProps {
  activities: Activity[];
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  onRefresh,
  isLoading,
}) => {
  const [recovering, setRecovering] = useState(false);

  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffSec = Math.floor((now.getTime() - past.getTime()) / 1000);

      if (diffSec < 45) return 'just now';
      if (diffSec < 90) return '1 minute ago';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
      if (diffSec < 7200) return '1 hour ago';
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
      return past.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const handleManualCatchup = async () => {
    if (!onRefresh) return;
    setRecovering(true);
    try {
      await onRefresh();
    } finally {
      setRecovering(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>
          <ActivityIcon size={17} color="#6366f1" />
          <span>Real-Time Activity Stream</span>
        </div>

        {onRefresh && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleManualCatchup}
            disabled={isLoading || recovering}
            title="Sync latest activities (Catch-up)"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
          >
            <RefreshCw size={12} className={isLoading || recovering ? 'pulse-dot' : ''} />
            <span>Catch Up</span>
          </button>
        )}
      </div>

      <div style={{ overflowY: 'auto', flex: 1, maxHeight: '450px', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {activities.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
            No recent activity logged yet.
          </div>
        ) : (
          activities.map((act) => (
            <div
              key={act.id}
              style={{
                padding: '0.7rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.3rem',
                transition: 'background 0.15s ease',
              }}
            >
              <div style={{ fontSize: '0.83rem', color: '#e2e8f0', lineHeight: 1.4 }}>
                {act.displayMessage || act.summary}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.72rem',
                  color: '#64748b',
                }}
              >
                <span>By: {act.user?.name || 'System / Auto'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={11} />
                  {act.relativeTime || formatTimeAgo(act.createdAt)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
