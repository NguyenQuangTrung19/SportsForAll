import { z } from 'zod';
import { ATTENDANCE_STATUSES } from '../types/dashboard.js';

export const setAttendanceSchema = z.object({
  status: z.enum(ATTENDANCE_STATUSES),
});
export type SetAttendanceInput = z.infer<typeof setAttendanceSchema>;
