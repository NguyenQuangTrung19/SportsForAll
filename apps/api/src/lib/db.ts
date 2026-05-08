import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

export const prisma = new PrismaClient({
  log: env.isDev ? ['query', 'warn', 'error'] : ['warn', 'error'],
});
