-- Nhac tran sap dien ra (FR-009.4).
ALTER TYPE "NotificationType" ADD VALUE 'match_reminder';

ALTER TABLE "Match" ADD COLUMN "reminderSentAt" TIMESTAMP(3);

CREATE INDEX "Match_status_reminderSentAt_scheduledAt_idx" ON "Match"("status", "reminderSentAt", "scheduledAt");
