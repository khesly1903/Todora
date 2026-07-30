-- AlterTable
ALTER TABLE "User" ADD COLUMN "avatarSeed" TEXT,
ADD COLUMN "avatarRegenDate" TEXT,
ADD COLUMN "avatarRegenCount" INTEGER NOT NULL DEFAULT 0;
