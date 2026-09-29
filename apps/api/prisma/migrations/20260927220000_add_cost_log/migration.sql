-- Add CostLog model for cost tracking (supports zero-cost mode: all costs default to 0)

CREATE TYPE "Currency" AS ENUM ('USD', 'EUR', 'GBP');

CREATE TABLE "cost_log" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "model" TEXT,
    "agentId" TEXT,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_log_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cost_log_analysisRunId_fkey" FOREIGN KEY ("analysisRunId")
        REFERENCES "analysis_runs" ("id") ON DELETE CASCADE
);

CREATE INDEX "cost_log_analysisRunId_idx" ON "cost_log"("analysisRunId");
CREATE INDEX "cost_log_createdAt_idx" ON "cost_log"("createdAt");

-- Add metadata field to analysis_runs for extensibility
ALTER TABLE "analysis_runs" ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}';