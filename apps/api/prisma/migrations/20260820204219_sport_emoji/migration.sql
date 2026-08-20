ALTER TABLE "Sport" ADD COLUMN "emoji" TEXT;
UPDATE "Sport" SET "emoji" = '⚽' WHERE "slug" = 'football';
UPDATE "Sport" SET "emoji" = '🏀' WHERE "slug" = 'basketball';
UPDATE "Sport" SET "emoji" = '🏸' WHERE "slug" = 'badminton';
UPDATE "Sport" SET "emoji" = '🏐' WHERE "slug" = 'volleyball';
UPDATE "Sport" SET "emoji" = '🎾' WHERE "slug" = 'tennis';
