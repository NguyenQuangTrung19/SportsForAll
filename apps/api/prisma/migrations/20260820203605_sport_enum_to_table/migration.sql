-- Chuyen Sport tu enum Postgres sang bang, de admin them mon luc chay.
--
-- Thu tu bat buoc: Postgres dung chung mot khong gian ten cho TYPE va TABLE,
-- nen phai go het cot khoi enum va DROP TYPE truoc khi CREATE TABLE cung ten.

-- 1) Doi 7 cot tu enum sang text. Cast enum -> text la hop le, index tu dung lai.
ALTER TABLE "SportPreference"    ALTER COLUMN "sport" TYPE TEXT USING "sport"::text;
ALTER TABLE "Team"               ALTER COLUMN "sport" TYPE TEXT USING "sport"::text;
ALTER TABLE "RecruitmentPost"    ALTER COLUMN "sport" TYPE TEXT USING "sport"::text;
ALTER TABLE "MatchRequest"       ALTER COLUMN "sport" TYPE TEXT USING "sport"::text;
ALTER TABLE "Match"              ALTER COLUMN "sport" TYPE TEXT USING "sport"::text;
ALTER TABLE "LookingForTeamPost" ALTER COLUMN "sport" TYPE TEXT USING "sport"::text;
ALTER TABLE "LandingImage"       ALTER COLUMN "sport" TYPE TEXT USING "sport"::text;

-- 2) Khong con cot nao dung enum -> bo type di.
DROP TYPE "Sport";

-- 3) Bang danh muc.
CREATE TABLE "Sport" (
    "slug" TEXT NOT NULL,
    "nameVi" TEXT NOT NULL,
    "primary" TEXT NOT NULL,
    "primaryDark" TEXT NOT NULL,
    "iconUrl" TEXT,
    "positions" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sport_pkey" PRIMARY KEY ("slug")
);

CREATE INDEX "Sport_active_sortOrder_idx" ON "Sport"("active", "sortOrder");

-- 4) Nam mon dang co, giu nguyen mau va vi tri choi da dung tu truoc.
INSERT INTO "Sport" ("slug","nameVi","primary","primaryDark","positions","sortOrder","updatedAt") VALUES
  ('football',  'Bóng đá',     '#00A843','#007A30', ARRAY['Thủ môn','Hậu vệ','Tiền vệ','Tiền đạo'],                                    1, CURRENT_TIMESTAMP),
  ('basketball','Bóng rổ',     '#DE5400','#A33D00', ARRAY['Point Guard','Shooting Guard','Small Forward','Power Forward','Center'],     2, CURRENT_TIMESTAMP),
  ('badminton', 'Cầu lông',    '#1559AB','#0E3D75', ARRAY['Đơn','Đôi','Đôi nam nữ'],                                                    3, CURRENT_TIMESTAMP),
  ('volleyball','Bóng chuyền', '#B87A00','#8A5A00', ARRAY['Chuyền 2','Đối chuyền','Chủ công','Phụ công','Libero'],                      4, CURRENT_TIMESTAMP),
  ('tennis',    'Tennis',      '#4F7A1F','#385514', ARRAY['Đơn','Đôi'],                                                                 5, CURRENT_TIMESTAMP);

-- 5) Khoa ngoai. Restrict: khong cho xoa mon khi con doi/bai dang tham chieu.
ALTER TABLE "SportPreference"    ADD CONSTRAINT "SportPreference_sport_fkey"    FOREIGN KEY ("sport") REFERENCES "Sport"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Team"               ADD CONSTRAINT "Team_sport_fkey"               FOREIGN KEY ("sport") REFERENCES "Sport"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecruitmentPost"    ADD CONSTRAINT "RecruitmentPost_sport_fkey"    FOREIGN KEY ("sport") REFERENCES "Sport"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MatchRequest"       ADD CONSTRAINT "MatchRequest_sport_fkey"       FOREIGN KEY ("sport") REFERENCES "Sport"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Match"              ADD CONSTRAINT "Match_sport_fkey"              FOREIGN KEY ("sport") REFERENCES "Sport"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LookingForTeamPost" ADD CONSTRAINT "LookingForTeamPost_sport_fkey" FOREIGN KEY ("sport") REFERENCES "Sport"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LandingImage"       ADD CONSTRAINT "LandingImage_sport_fkey"       FOREIGN KEY ("sport") REFERENCES "Sport"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
