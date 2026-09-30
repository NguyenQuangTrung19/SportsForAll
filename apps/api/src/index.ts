import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/db.js';
import { logger } from './lib/logger.js';
import { startMatchReminders } from './lib/match-reminders.js';

function main() {
  const server = createApp().listen(env.PORT, () => {
    logger.info(`🚀 API listening on http://localhost:${env.PORT}`);
  });
  const stopReminders = startMatchReminders();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down');
    stopReminders();
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

try {
  main();
} catch (err) {
  logger.fatal({ err }, 'fatal startup error');
  process.exit(1);
}
