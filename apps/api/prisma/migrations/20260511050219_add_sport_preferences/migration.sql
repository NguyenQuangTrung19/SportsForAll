-- CreateEnum
CREATE TYPE "Sport" AS ENUM ('football', 'basketball', 'badminton', 'volleyball', 'tennis');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('beginner', 'amateur', 'intermediate', 'advanced', 'pro');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SportPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sport" "Sport" NOT NULL,
    "skillLevel" "SkillLevel" NOT NULL,
    "position" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SportPreference_sport_skillLevel_idx" ON "SportPreference"("sport", "skillLevel");

-- CreateIndex
CREATE UNIQUE INDEX "SportPreference_userId_sport_key" ON "SportPreference"("userId", "sport");

-- AddForeignKey
ALTER TABLE "SportPreference" ADD CONSTRAINT "SportPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
