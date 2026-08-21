import { z } from 'zod';
import { REPORT_REASONS } from '../types/report.js';

export const createReportSchema = z.object({
  reportedTeamId: z.string().cuid(),
  matchId: z.string().cuid().optional(),
  reason: z.enum(REPORT_REASONS),
  detail: z.string().trim().max(1000).optional(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;
