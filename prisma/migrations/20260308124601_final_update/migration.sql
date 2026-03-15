/*
  Warnings:

  - You are about to drop the column `assigneeId` on the `Task` table. All the data in the column will be lost.
  - Added the required column `creatorId` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Made the column `description` on table `Task` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_assigneeId_fkey";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "assigneeId",
ADD COLUMN     "creatorId" TEXT NOT NULL,
ADD COLUMN     "leadAssigneeId" TEXT,
ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "description" SET DEFAULT 'No description has been added yet.';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "failedAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockoutUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "_TaskAssignees" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TaskAssignees_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_TaskAssignees_B_index" ON "_TaskAssignees"("B");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_leadAssigneeId_fkey" FOREIGN KEY ("leadAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TaskAssignees" ADD CONSTRAINT "_TaskAssignees_A_fkey" FOREIGN KEY ("A") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TaskAssignees" ADD CONSTRAINT "_TaskAssignees_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
