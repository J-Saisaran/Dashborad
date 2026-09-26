import React, { useEffect } from 'react';
import { Filter, X, Calendar } from 'lucide-react';
import type { TaskFilterParams } from '../types/index.ts';

interface TaskFilterBarProps {
  filters: TaskFilterParams;
  onFilterChange: (filters: TaskFilterParams) => void;
  showProjectFilter?: boolean;
  projects?: { id: string; name: string }[];
  selectedProjectId?: string;
  onProjectChange?: (projectId: string) => void;
}

export const TaskFilterBar: React.FC<TaskFilterBarProps> = ({
  filters,
  onFilterChange,
  showProjectFilter,
  projects,
  selectedProjectId,
  onProjectChange,
}) => {
  // Sync state with URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialFilters: TaskFilterParams = {};

    if (params.get('status')) initialFilters.status = params.get('status')!;
    if (params.get('priority')) initialFilters.priority = params.get('priority')!;
    if (params.get('dueDateFrom')) initialFilters.dueDateFrom = params.get('dueDateFrom')!;
    if (params.get('dueDateTo')) initialFilters.dueDateTo = params.get('dueDateTo')!;

    if (
      initialFilters.status !== filters.status ||
      initialFilters.priority !== filters.priority ||
      initialFilters.dueDateFrom !== filters.dueDateFrom ||
      initialFilters.dueDateTo !== filters.dueDateTo
    ) {
      onFilterChange(initialFilters);
    }
  }, []);

  const updateParam = (key: keyof TaskFilterParams, value: string | undefined) => {
    const nextFilters = { ...filters, [key]: value || undefined };
    onFilterChange(nextFilters);

    // Update URL query parameters for shareable URL without page reload
    const url = new URL(window.location.href);
    if (value && value !== 'ALL') {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
    window.history.pushState({}, '', url.toString());
  };

  const handleClearFilters = () => {
    onFilterChange({});
    const url = new URL(window.location.href);
    url.searchParams.delete('status');
    url.searchParams.delete('priority');
    url.searchParams.delete('dueDateFrom');
    url.searchParams.delete('dueDateTo');
    window.history.pushState({}, '', url.toString());
  };

  const hasActiveFilters = Boolean(
    filters.status || filters.priority || filters.dueDateFrom || filters.dueDateTo
  );

  return (
    <div
      className="glass-panel"
      style={{
        padding: '1rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#818cf8', fontWeight: 600, fontSize: '0.85rem' }}>
          <Filter size={16} />
          <span>Filters:</span>
        </div>

        {/* Project Selector (if enabled) */}
        {showProjectFilter && projects && onProjectChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <select
              aria-label="Filter by Project"
              className="input-control"
              value={selectedProjectId || 'ALL'}
              onChange={(e) => onProjectChange(e.target.value === 'ALL' ? '' : e.target.value)}
              style={{ width: 'auto', minWidth: '160px', padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
            >
              <option value="ALL">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status Filter */}
        <div>
          <select
            aria-label="Filter by Status"
            className="input-control"
            value={filters.status || 'ALL'}
            onChange={(e) => updateParam('status', e.target.value === 'ALL' ? undefined : e.target.value)}
            style={{ width: 'auto', minWidth: '140px', padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="TO_DO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="DONE">Done</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div>
          <select
            aria-label="Filter by Priority"
            className="input-control"
            value={filters.priority || 'ALL'}
            onChange={(e) => updateParam('priority', e.target.value === 'ALL' ? undefined : e.target.value)}
            style={{ width: 'auto', minWidth: '130px', padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>

        {/* Date Range: From */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Calendar size={14} style={{ color: '#64748b' }} />
          <input
            type="date"
            aria-label="Due date from"
            className="input-control"
            value={filters.dueDateFrom || ''}
            onChange={(e) => updateParam('dueDateFrom', e.target.value)}
            style={{ width: 'auto', padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
            title="Due Date From"
          />
          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>to</span>
          <input
            type="date"
            aria-label="Due date to"
            className="input-control"
            value={filters.dueDateTo || ''}
            onChange={(e) => updateParam('dueDateTo', e.target.value)}
            style={{ width: 'auto', padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
            title="Due Date To"
          />
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleClearFilters}
          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#f87171' }}
        >
          <X size={14} />
          <span>Clear Filters</span>
        </button>
      )}
    </div>
  );
};
