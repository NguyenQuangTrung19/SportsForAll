import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

export function createRealtime(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: env.corsOrigins, credentials: true },
  });

  io.on('connection', (socket) => {
    logger.debug({ socketId: socket.id }, 'socket connected');
    socket.on('disconnect', (reason) => {
      logger.debug({ socketId: socket.id, reason }, 'socket disconnected');
    });
  });

  return io;
}
