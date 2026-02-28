/*
  Warnings:

  - A unique constraint covering the columns `[file_id,user_id]` on the table `drive_documents` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `drive_documents` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "drive_documents_file_id_key";

-- AlterTable
ALTER TABLE "drive_documents" ADD COLUMN     "user_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "drive_documents_user_id_idx" ON "drive_documents"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "drive_documents_file_id_user_id_key" ON "drive_documents"("file_id", "user_id");
