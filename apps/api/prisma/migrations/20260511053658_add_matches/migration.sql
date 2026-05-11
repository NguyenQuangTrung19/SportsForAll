-- CreateEnum
CREATE TYPE "MatchRequestStatus" AS ENUM ('open', 'matched', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('scheduled', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "MatchRequest" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "sport" "Sport" NOT NULL,
    "region" TEXT,
    "preferredTime" TIMESTAMP(3),
    "venueName" TEXT,
    "description" TEXT NOT NULL,
    "status" "MatchRequestStatus" NOT NULL DEFAULT 'open',
    "skillLevelMin" "SkillLevel",
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "matchRequestId" TEXT NOT NULL,
    "challengerTeamId" TEXT NOT NULL,
    "message" TEXT,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "matchRequestId" TEXT,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "sport" "Sport" NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "venueName" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'scheduled',
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchRequest_sport_region_status_idx" ON "MatchRequest"("sport", "region", "status");

-- CreateIndex
CREATE INDEX "MatchRequest_teamId_status_idx" ON "MatchRequest"("teamId", "status");

-- CreateIndex
CREATE INDEX "MatchRequest_status_createdAt_idx" ON "MatchRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Challenge_challengerTeamId_status_idx" ON "Challenge"("challengerTeamId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_matchRequestId_challengerTeamId_key" ON "Challenge"("matchRequestId", "challengerTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_matchRequestId_key" ON "Match"("matchRequestId");

-- CreateIndex
CREATE INDEX "Match_homeTeamId_status_idx" ON "Match"("homeTeamId", "status");

-- CreateIndex
CREATE INDEX "Match_awayTeamId_status_idx" ON "Match"("awayTeamId", "status");

-- CreateIndex
CREATE INDEX "Match_sport_scheduledAt_idx" ON "Match"("sport", "scheduledAt");

-- AddForeignKey
ALTER TABLE "MatchRequest" ADD CONSTRAINT "MatchRequest_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_matchRequestId_fkey" FOREIGN KEY ("matchRequestId") REFERENCES "MatchRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_challengerTeamId_fkey" FOREIGN KEY ("challengerTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_matchRequestId_fkey" FOREIGN KEY ("matchRequestId") REFERENCES "MatchRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
