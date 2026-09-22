CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

CREATE TABLE "analysis_runs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "ref" TEXT NOT NULL DEFAULT 'HEAD',
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "totalStages" INTEGER NOT NULL DEFAULT 0,
    "completedStages" INTEGER NOT NULL DEFAULT 0,
    "currentStage" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "analysis_runs_projectId_idx" ON "analysis_runs"("projectId");
CREATE INDEX "analysis_runs_repositoryId_idx" ON "analysis_runs"("repositoryId");
CREATE INDEX "analysis_runs_status_idx" ON "analysis_runs"("status");

ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_repositoryId_fkey"
    FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
