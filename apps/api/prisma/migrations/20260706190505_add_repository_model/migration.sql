-- CreateEnum
CREATE TYPE "RepositoryProvider" AS ENUM ('LOCAL', 'GITHUB', 'ZIP');

-- CreateEnum
CREATE TYPE "RepositoryStatus" AS ENUM ('ACTIVE', 'INDEXING', 'INDEXED', 'FAILED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "repositories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "provider" "RepositoryProvider" NOT NULL DEFAULT 'LOCAL',
    "status" "RepositoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "url" TEXT,
    "defaultBranch" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repositories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "repositories_projectId_idx" ON "repositories"("projectId");

-- CreateIndex
CREATE INDEX "repositories_provider_idx" ON "repositories"("provider");

-- CreateIndex
CREATE INDEX "repositories_status_idx" ON "repositories"("status");

-- AddForeignKey
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
