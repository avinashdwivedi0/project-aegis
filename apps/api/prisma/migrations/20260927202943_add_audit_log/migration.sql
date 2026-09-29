-- Add RepairBridgeStatus enum, bridge columns, audit log table, and repair-domain sourceFindingKey/analysisRunId columns

CREATE TYPE "RepairBridgeStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- Add bridge status columns to analysis_runs
ALTER TABLE "analysis_runs"
    ADD COLUMN "bridgeStatus" "RepairBridgeStatus" NOT NULL DEFAULT 'PENDING',
    ADD COLUMN "bridgeError" TEXT;

-- Add sourceFindingKey / analysisRunId to findings (repair domain)
ALTER TABLE "Finding"
    ADD COLUMN "sourceFindingKey" TEXT,
    ADD COLUMN "analysisRunId" TEXT;

-- Add analysisRunId to repair jobs (links back to source analysis run)
ALTER TABLE "RepairJob"
    ADD COLUMN "analysisRunId" TEXT;

-- Audit log table (append-only governance trail)
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "success" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_log_actorId_idx" ON "audit_log"("actorId");
CREATE INDEX "audit_log_targetType_targetId_idx" ON "audit_log"("targetType", "targetId");
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log"("createdAt");