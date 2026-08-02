-- AlterTable
ALTER TABLE "Task" ADD COLUMN "updatedById" TEXT;

-- CreateIndex
CREATE INDEX "Task_updatedById_idx" ON "Task"("updatedById");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
