-- CreateEnum
CREATE TYPE "VenueStatus" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('open', 'booked', 'blocked');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('pending', 'confirmed', 'rejected', 'cancelled');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'booking_requested';
ALTER TYPE "NotificationType" ADD VALUE 'booking_confirmed';
ALTER TYPE "NotificationType" ADD VALUE 'booking_rejected';
ALTER TYPE "NotificationType" ADD VALUE 'booking_cancelled';

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "region" TEXT,
    "description" TEXT,
    "photoUrl" TEXT,
    "pricePerHour" INTEGER NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "VenueStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueSlot" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "price" INTEGER NOT NULL,
    "status" "SlotStatus" NOT NULL DEFAULT 'open',
    "openForTeams" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueReview" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Venue_sport_region_status_idx" ON "Venue"("sport", "region", "status");
CREATE INDEX "Venue_ownerId_idx" ON "Venue"("ownerId");
CREATE INDEX "Venue_status_rating_idx" ON "Venue"("status", "rating");
CREATE INDEX "VenueSlot_venueId_startsAt_idx" ON "VenueSlot"("venueId", "startsAt");
CREATE INDEX "VenueSlot_status_startsAt_idx" ON "VenueSlot"("status", "startsAt");
CREATE INDEX "VenueSlot_openForTeams_status_startsAt_idx" ON "VenueSlot"("openForTeams", "status", "startsAt");
CREATE UNIQUE INDEX "Booking_slotId_userId_key" ON "Booking"("slotId", "userId");
CREATE INDEX "Booking_slotId_status_idx" ON "Booking"("slotId", "status");
CREATE INDEX "Booking_userId_status_idx" ON "Booking"("userId", "status");
CREATE UNIQUE INDEX "VenueReview_venueId_userId_key" ON "VenueReview"("venueId", "userId");
CREATE INDEX "VenueReview_venueId_idx" ON "VenueReview"("venueId");

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_sport_fkey" FOREIGN KEY ("sport") REFERENCES "Sport"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VenueSlot" ADD CONSTRAINT "VenueSlot_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "VenueSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VenueReview" ADD CONSTRAINT "VenueReview_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VenueReview" ADD CONSTRAINT "VenueReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
