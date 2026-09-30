-- Uy tin ca nhan (FR-002.12) va so diem doi (FR-007.7). Cong thuc nam o src/lib/reputation.ts; ban SQL
-- duoi day chi dung mot lan de tinh cho du lieu da co.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "ratedMatches" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: doi nguoi nay ra san cho, suy tu thanh vien hien tai.
ALTER TABLE "MatchAttendance" ADD COLUMN "teamId" TEXT;

UPDATE "MatchAttendance" a
SET "teamId" = CASE
  WHEN EXISTS (SELECT 1 FROM "TeamMember" tm WHERE tm."teamId" = m."homeTeamId" AND tm."userId" = a."userId") THEN m."homeTeamId"
  WHEN EXISTS (SELECT 1 FROM "TeamMember" tm WHERE tm."teamId" = m."awayTeamId" AND tm."userId" = a."userId") THEN m."awayTeamId"
END
FROM "Match" m
WHERE m."id" = a."matchId";

-- Nguoi da roi ca hai doi: dong nay von da bi summarizeAttendance bo qua,
-- khong con cach nao biet ho da ra san cho doi nao.
DELETE FROM "MatchAttendance" WHERE "teamId" IS NULL;

ALTER TABLE "MatchAttendance" ALTER COLUMN "teamId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "MatchAttendance_userId_status_idx" ON "MatchAttendance"("userId", "status");

-- AddForeignKey
ALTER TABLE "MatchAttendance" ADD CONSTRAINT "MatchAttendance_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: so diem, matchId co y khong co khoa ngoai (xem schema.prisma).
CREATE TABLE "PlayerMatchScore" (
    "userId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerMatchScore_pkey" PRIMARY KEY ("userId","matchId")
);

-- AddForeignKey
ALTER TABLE "PlayerMatchScore" ADD CONSTRAINT "PlayerMatchScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill so diem tu phieu cham da co.
INSERT INTO "PlayerMatchScore" ("userId", "matchId", "score", "updatedAt")
SELECT a."userId", a."matchId", AVG(r."score")::float, CURRENT_TIMESTAMP
FROM "MatchAttendance" a
JOIN "Match" m ON m."id" = a."matchId" AND m."status" <> 'cancelled'
JOIN "Rating" r ON r."matchId" = a."matchId" AND r."ratedTeamId" = a."teamId"
WHERE a."status" = 'going'
GROUP BY a."userId", a."matchId";

-- Backfill uy tin: PRIOR_SCORE = 3, PRIOR_WEIGHT = 3.
WITH per_user AS (
  SELECT "userId", COUNT(*)::int AS n, SUM("score") AS total FROM "PlayerMatchScore" GROUP BY "userId"
)
UPDATE "User" u
SET "ratedMatches" = p.n, "reputation" = (3 * 3 + p.total) / (3 + p.n)
FROM per_user p
WHERE p."userId" = u."id";

-- CreateTable: so diem doi, cung ly do.
CREATE TABLE "TeamMatchScore" (
    "teamId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMatchScore_pkey" PRIMARY KEY ("teamId","matchId")
);

-- AddForeignKey
ALTER TABLE "TeamMatchScore" ADD CONSTRAINT "TeamMatchScore_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "TeamMatchScore" ("teamId", "matchId", "score", "updatedAt")
SELECT "ratedTeamId", "matchId", AVG("score")::float, CURRENT_TIMESTAMP
FROM "Rating"
GROUP BY "ratedTeamId", "matchId";

-- Uy tin doi = trung binh diem cac tran (truoc day la trung binh moi phieu).
UPDATE "Team" t
SET "reputation" = s.avg
FROM (SELECT "teamId", AVG("score") AS avg FROM "TeamMatchScore" GROUP BY "teamId") s
WHERE s."teamId" = t."id";
