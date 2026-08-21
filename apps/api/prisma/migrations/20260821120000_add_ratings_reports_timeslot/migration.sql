-- CreateEnum
CREATE TYPE "TimeSlot" AS ENUM ('morning', 'afternoon', 'evening');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('no_show', 'violence', 'abusive_language', 'cheating', 'other');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('pending', 'reviewed', 'dismissed');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'rating_received';

-- AlterTable
ALTER TABLE "MatchRequest" ADD COLUMN "timeSlot" "TimeSlot";

-- Backfill: preferredTime luu theo UTC, buoi tinh theo gio Viet Nam (UTC+7).
UPDATE "MatchRequest"
SET "timeSlot" = CASE
  WHEN EXTRACT(HOUR FROM "preferredTime" + INTERVAL '7 hours') BETWEEN 5 AND 11 THEN 'morning'::"TimeSlot"
  WHEN EXTRACT(HOUR FROM "preferredTime" + INTERVAL '7 hours') BETWEEN 12 AND 17 THEN 'afternoon'::"TimeSlot"
  ELSE 'evening'::"TimeSlot"
END
WHERE "preferredTime" IS NOT NULL;

-- CreateIndex
CREATE INDEX "MatchRequest_status_timeSlot_idx" ON "MatchRequest"("status", "timeSlot");

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "ratedTeamId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rating_matchId_raterId_key" ON "Rating"("matchId", "raterId");

-- CreateIndex
CREATE INDEX "Rating_ratedTeamId_idx" ON "Rating"("ratedTeamId");

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedTeamId" TEXT NOT NULL,
    "matchId" TEXT,
    "reason" "ReportReason" NOT NULL,
    "detail" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Report_reportedTeamId_status_idx" ON "Report"("reportedTeamId", "status");

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_ratedTeamId_fkey" FOREIGN KEY ("ratedTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedTeamId_fkey" FOREIGN KEY ("reportedTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
