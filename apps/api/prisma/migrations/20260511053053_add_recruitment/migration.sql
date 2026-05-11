-- CreateEnum
CREATE TYPE "RecruitmentStatus" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "JoinRequestStatus" AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');

-- CreateTable
CREATE TABLE "RecruitmentPost" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "sport" "Sport" NOT NULL,
    "region" TEXT,
    "positionNeeded" TEXT,
    "skillLevelMin" "SkillLevel",
    "description" TEXT NOT NULL,
    "status" "RecruitmentStatus" NOT NULL DEFAULT 'open',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecruitmentPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JoinRequest" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "JoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecruitmentPost_sport_region_status_idx" ON "RecruitmentPost"("sport", "region", "status");

-- CreateIndex
CREATE INDEX "RecruitmentPost_teamId_status_idx" ON "RecruitmentPost"("teamId", "status");

-- CreateIndex
CREATE INDEX "RecruitmentPost_status_createdAt_idx" ON "RecruitmentPost"("status", "createdAt");

-- CreateIndex
CREATE INDEX "JoinRequest_userId_status_idx" ON "JoinRequest"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "JoinRequest_postId_userId_key" ON "JoinRequest"("postId", "userId");

-- AddForeignKey
ALTER TABLE "RecruitmentPost" ADD CONSTRAINT "RecruitmentPost_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_postId_fkey" FOREIGN KEY ("postId") REFERENCES "RecruitmentPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
