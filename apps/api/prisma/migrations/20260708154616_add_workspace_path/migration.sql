-- AlterTable
ALTER TABLE "repositories" ADD COLUMN     "workspacePath" TEXT;

-- CreateIndex
CREATE INDEX "repositories_workspacePath_idx" ON "repositories"("workspacePath");

-- CreateIndex
CREATE INDEX "repository_files_parentPath_idx" ON "repository_files"("parentPath");
