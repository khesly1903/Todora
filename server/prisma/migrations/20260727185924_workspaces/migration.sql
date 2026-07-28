-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- Seed a default workspace so existing areas have a home.
INSERT INTO "Workspace" ("id", "name", "sortOrder", "createdAt", "updatedAt")
VALUES ('ws_default_personal', 'Personal', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable: add column nullable first, backfill, then enforce NOT NULL.
ALTER TABLE "Area" ADD COLUMN "workspaceId" TEXT;

UPDATE "Area" SET "workspaceId" = 'ws_default_personal' WHERE "workspaceId" IS NULL;

ALTER TABLE "Area" ALTER COLUMN "workspaceId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Area_workspaceId_idx" ON "Area"("workspaceId");

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
