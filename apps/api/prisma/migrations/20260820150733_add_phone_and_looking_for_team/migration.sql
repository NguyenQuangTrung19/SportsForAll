-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "LookingForTeamPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sport" "Sport" NOT NULL,
    "region" TEXT,
    "position" TEXT,
    "skillLevel" "SkillLevel",
    "description" TEXT NOT NULL,
    "status" "RecruitmentStatus" NOT NULL DEFAULT 'open',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LookingForTeamPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LookingForTeamPost_sport_region_status_idx" ON "LookingForTeamPost"("sport", "region", "status");

-- CreateIndex
CREATE INDEX "LookingForTeamPost_userId_status_idx" ON "LookingForTeamPost"("userId", "status");

-- CreateIndex
CREATE INDEX "LookingForTeamPost_status_createdAt_idx" ON "LookingForTeamPost"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- AddForeignKey
ALTER TABLE "LookingForTeamPost" ADD CONSTRAINT "LookingForTeamPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

