import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/environment.js';
import authRouter from './routes/auth.routes.js';
import clientRouter from './routes/client.routes.js';
import projectRouter from './routes/project.routes.js';
import taskRouter from './routes/task.routes.js';
import userRouter from './routes/user.routes.js';
import activityRouter from './routes/activity.routes.js';
import notificationRouter from './routes/notification.routes.js';
import dashboardRouter from './routes/dashboard.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

// Standard middleware
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Healthcheck endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'UP',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    },
  });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/clients', clientRouter);
app.use('/api/projects', projectRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/users', userRouter);
app.use('/api/activities', activityRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/dashboard', dashboardRouter);

// Centralized Error Handler (must be registered after all routes)
app.use(errorHandler);

export { app };
export default app;
