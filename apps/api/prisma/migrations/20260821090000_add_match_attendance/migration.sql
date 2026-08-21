-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('going', 'not_going');

-- CreateTable
CREATE TABLE "MatchAttendance" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchAttendance_matchId_userId_key" ON "MatchAttendance"("matchId", "userId");

-- CreateIndex
CREATE INDEX "MatchAttendance_matchId_status_idx" ON "MatchAttendance"("matchId", "status");

-- AddForeignKey
ALTER TABLE "MatchAttendance" ADD CONSTRAINT "MatchAttendance_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchAttendance" ADD CONSTRAINT "MatchAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
