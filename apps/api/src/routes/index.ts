import { Router } from 'express';
import { authRouter } from './auth.js';
import { healthRouter } from './health.js';
import { profileRouter } from './profile.js';
import { teamsRouter } from './teams.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/profile', profileRouter);
apiRouter.use('/teams', teamsRouter);
