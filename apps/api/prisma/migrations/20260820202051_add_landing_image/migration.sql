-- CreateTable
CREATE TABLE "LandingImage" (
    "id" TEXT NOT NULL,
    "sport" "Sport" NOT NULL,
    "largeUrl" TEXT NOT NULL,
    "smallUrl" TEXT NOT NULL,
    "tileUrl" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandingImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LandingImage_sport_key" ON "LandingImage"("sport");

-- AddForeignKey
ALTER TABLE "LandingImage" ADD CONSTRAINT "LandingImage_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

