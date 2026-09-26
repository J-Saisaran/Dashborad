import http from 'http';
import { app } from './app.js';
import { env } from './config/environment.js';
import { initSocketServer } from './websocket/socket.server.js';

import { startOverdueTaskScheduler } from './jobs/overdueTask.job.js';

const server = http.createServer(app);
const io = initSocketServer(server);

server.listen(env.PORT, () => {
  console.log(`[Backend] Server listening on port ${env.PORT} (${env.NODE_ENV})`);
  console.log(`[Backend] Allowed CORS Origin: ${env.CLIENT_URL}`);
  
  // Start background overdue task detection job (runs every minute)
  startOverdueTaskScheduler();
});

export { server, io };
