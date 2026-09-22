CREATE TYPE "RepairJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE "FindingStatus" AS ENUM ('OPEN', 'REVIEWED', 'PATCHED', 'VALIDATED', 'REJECTED');
CREATE TYPE "FindingSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');
CREATE TYPE "PatchLifecycle" AS ENUM ('DETECTED', 'REVIEWED', 'PATCH_GENERATED', 'PATCH_APPLIED_IN_WORKSPACE', 'TESTS_RERAN', 'VALIDATED', 'REJECTED');

ALTER TABLE "repository_files" ADD COLUMN "content" TEXT;

CREATE TABLE "RepairJob" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "repositoryId" TEXT NOT NULL,
  "ref" TEXT NOT NULL DEFAULT 'HEAD',
  "status" "RepairJobStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RepairJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Finding" (
  "id" TEXT NOT NULL,
  "repairJobId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "severity" "FindingSeverity" NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "evidence" JSONB NOT NULL DEFAULT '[]',
  "filePath" TEXT NOT NULL,
  "startLine" INTEGER,
  "endLine" INTEGER,
  "detectionSource" TEXT NOT NULL,
  "recommendedFix" TEXT,
  "status" "FindingStatus" NOT NULL DEFAULT 'OPEN',
  "patchId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Patch" (
  "id" TEXT NOT NULL,
  "findingId" TEXT NOT NULL,
  "repairJobId" TEXT NOT NULL,
  "diffContent" TEXT NOT NULL,
  "diffHash" TEXT NOT NULL,
  "patchBytes" INTEGER NOT NULL,
  "linesAdded" INTEGER NOT NULL,
  "linesRemoved" INTEGER NOT NULL,
  "riskScore" DOUBLE PRECISION NOT NULL,
  "target" TEXT NOT NULL,
  "lifecycle" "PatchLifecycle" NOT NULL DEFAULT 'PATCH_GENERATED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "appliedAt" TIMESTAMP(3),
  "validatedAt" TIMESTAMP(3),
  CONSTRAINT "Patch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Validation" (
  "id" TEXT NOT NULL,
  "patchId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "testsRun" INTEGER NOT NULL DEFAULT 0,
  "testsPassed" INTEGER NOT NULL DEFAULT 0,
  "testsFailed" INTEGER NOT NULL DEFAULT 0,
  "lintPassed" BOOLEAN NOT NULL DEFAULT false,
  "typeCheckPassed" BOOLEAN NOT NULL DEFAULT false,
  "securityScanPassed" BOOLEAN NOT NULL DEFAULT false,
  "failures" JSONB NOT NULL DEFAULT '[]',
  "durationMs" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Validation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatchApplication" (
  "id" TEXT NOT NULL,
  "patchId" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "success" BOOLEAN NOT NULL,
  "output" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatchApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Finding_patchId_key" ON "Finding"("patchId");
CREATE UNIQUE INDEX "Patch_findingId_key" ON "Patch"("findingId");
CREATE INDEX "RepairJob_projectId_idx" ON "RepairJob"("projectId");
CREATE INDEX "RepairJob_repositoryId_idx" ON "RepairJob"("repositoryId");
CREATE INDEX "RepairJob_status_idx" ON "RepairJob"("status");
CREATE INDEX "Finding_repairJobId_idx" ON "Finding"("repairJobId");
CREATE INDEX "Finding_status_idx" ON "Finding"("status");
CREATE INDEX "Finding_severity_idx" ON "Finding"("severity");
CREATE INDEX "Patch_repairJobId_idx" ON "Patch"("repairJobId");
CREATE INDEX "Patch_lifecycle_idx" ON "Patch"("lifecycle");
CREATE INDEX "Validation_patchId_idx" ON "Validation"("patchId");
CREATE INDEX "PatchApplication_patchId_idx" ON "PatchApplication"("patchId");

ALTER TABLE "RepairJob" ADD CONSTRAINT "RepairJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepairJob" ADD CONSTRAINT "RepairJob_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_repairJobId_fkey" FOREIGN KEY ("repairJobId") REFERENCES "RepairJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_patchId_fkey" FOREIGN KEY ("patchId") REFERENCES "Patch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Patch" ADD CONSTRAINT "Patch_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Patch" ADD CONSTRAINT "Patch_repairJobId_fkey" FOREIGN KEY ("repairJobId") REFERENCES "RepairJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Validation" ADD CONSTRAINT "Validation_patchId_fkey" FOREIGN KEY ("patchId") REFERENCES "Patch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatchApplication" ADD CONSTRAINT "PatchApplication_patchId_fkey" FOREIGN KEY ("patchId") REFERENCES "Patch"("id") ON DELETE CASCADE ON UPDATE CASCADE;