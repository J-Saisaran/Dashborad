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

const isOriginAllowed = (origin?: string): boolean => {
  if (!origin) return true;
  const cleanOrigin = origin.replace(/\/$/, '').toLowerCase();
  const cleanClientUrl = env.CLIENT_URL ? env.CLIENT_URL.replace(/\/$/, '').toLowerCase() : '';

  if (cleanOrigin === cleanClientUrl) return true;
  if (cleanOrigin.endsWith('.vercel.app')) return true;
  if (cleanOrigin.includes('localhost') || cleanOrigin.includes('127.0.0.1')) return true;

  return false;
};

// Standard middleware
app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, origin || true);
    }
    return callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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
