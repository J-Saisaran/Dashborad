import { TaskStatus } from '@prisma/client';

export const STATUS_DISPLAY_NAMES: Record<TaskStatus | string, string> = {
  TO_DO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
  OVERDUE: 'Overdue',
};

export const formatStatus = (status: TaskStatus | string): string => {
  return STATUS_DISPLAY_NAMES[status] || status;
};

/**
 * Formats a standardized activity summary string as required by the PDF:
 * "Ravi moved Task #12 from In Progress → In Review · 2 mins ago"
 */
export const buildActivitySummary = (
  userName: string,
  taskTitle: string,
  previousStatus: string,
  newStatus: string
): string => {
  const prev = formatStatus(previousStatus);
  const next = formatStatus(newStatus);
  return `${userName} moved "${taskTitle}" from ${prev} → ${next}`;
};

/**
 * Formats relative time (e.g. "just now", "2 mins ago", "1 hour ago", "yesterday")
 */
export const formatRelativeTime = (date: Date): string => {
  const now = Date.now();
  const diffInSeconds = Math.floor((now - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'min' : 'mins'} ago`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return 'yesterday';
  }
  return `${diffInDays} days ago`;
};
