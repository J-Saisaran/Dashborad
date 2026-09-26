import cron, { ScheduledTask } from 'node-cron';
import { TaskStatus } from '@prisma/client';
import { prisma } from '../config/database.js';
import { emitTaskStatusChanged } from '../websocket/event.emitter.js';
import { notificationService } from '../services/notification.service.js';
import { buildActivitySummary } from '../utils/activityFormatter.js';

let scheduledCronTask: ScheduledTask | null = null;

/**
 * Core scanning function that detects overdue tasks and marks them.
 * Guaranteed idempotent: tasks already in DONE or OVERDUE are excluded by the WHERE clause.
 */
export const scanAndMarkOverdueTasks = async (): Promise<{
  processedCount: number;
  updatedTaskIds: string[];
}> => {
  const now = new Date();

  // Find all tasks whose due date has elapsed and are neither DONE nor already OVERDUE
  // Leverages index `idx_tasks_overdue_scan` on (due_date, status)
  const overdueTasks = await prisma.task.findMany({
    where: {
      dueDate: { lt: now },
      status: {
        notIn: [TaskStatus.DONE, TaskStatus.OVERDUE],
      },
    },
    include: {
      project: { select: { id: true, name: true, ownerId: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });

  if (overdueTasks.length === 0) {
    return { processedCount: 0, updatedTaskIds: [] };
  }

  const updatedTaskIds: string[] = [];

  for (const task of overdueTasks) {
    const previousStatus = task.status;
    const newStatus = TaskStatus.OVERDUE;

    // Execute atomic status transition and activity recording
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: task.id },
        data: { status: newStatus },
        include: {
          project: { select: { id: true, name: true, ownerId: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      });

      const summary = buildActivitySummary('System', task.title, previousStatus, newStatus);

      const activity = await tx.activity.create({
        data: {
          taskId: task.id,
          projectId: task.projectId,
          userId: task.assignedToId || task.project.ownerId,
          previousStatus,
          newStatus,
          summary,
        },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          task: { select: { id: true, title: true } },
        },
      });

      return { updated, activity, summary };
    });

    updatedTaskIds.push(task.id);

    // Broadcast live WebSocket event to project room
    emitTaskStatusChanged(task.projectId, {
      task: result.updated,
      activity: {
        ...result.activity,
        relativeTime: 'just now',
        displayMessage: `${result.summary} · just now`,
      },
      previousStatus,
      newStatus,
    });

    // Notify project manager that task is overdue
    try {
      await notificationService.createNotification({
        userId: task.project.ownerId,
        taskId: task.id,
        title: 'Task Overdue',
        message: `Task "${task.title}" in project "${task.project.name}" is now overdue.`,
      });

      // Also notify assigned developer if assigned
      if (task.assignedToId) {
        await notificationService.createNotification({
          userId: task.assignedToId,
          taskId: task.id,
          title: 'Task Overdue',
          message: `Your assigned task "${task.title}" is past its due date.`,
        });
      }
    } catch (err) {
      // Don't let notification failure abort subsequent task processing
      console.error('[OverdueJob] Failed to dispatch notification:', err);
    }
  }

  return {
    processedCount: updatedTaskIds.length,
    updatedTaskIds,
  };
};

/**
 * Initializes and starts the background overdue task cron job.
 * Default: runs every minute ('* * * * *').
 */
export const startOverdueTaskScheduler = (cronSchedule = '* * * * *'): ScheduledTask => {
  if (scheduledCronTask) {
    scheduledCronTask.stop();
  }

  scheduledCronTask = cron.schedule(cronSchedule, async () => {
    try {
      const { processedCount } = await scanAndMarkOverdueTasks();
      if (processedCount > 0) {
        console.log(`[OverdueJob] Successfully marked ${processedCount} tasks as OVERDUE.`);
      }
    } catch (error) {
      console.error('[OverdueJob] Error executing scheduled scan:', error);
    }
  });

  console.log(`[OverdueJob] Background scheduler started with schedule: "${cronSchedule}"`);
  return scheduledCronTask;
};

/**
 * Stops the scheduled cron job cleanly.
 */
export const stopOverdueTaskScheduler = (): void => {
  if (scheduledCronTask) {
    scheduledCronTask.stop();
    scheduledCronTask = null;
    console.log('[OverdueJob] Background scheduler stopped.');
  }
};
