-- CreateTable
CREATE TABLE "repository_files" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "parentPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repository_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "repository_files_repositoryId_idx" ON "repository_files"("repositoryId");

-- CreateIndex
CREATE INDEX "repository_files_path_idx" ON "repository_files"("path");

-- AddForeignKey
ALTER TABLE "repository_files" ADD CONSTRAINT "repository_files_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
