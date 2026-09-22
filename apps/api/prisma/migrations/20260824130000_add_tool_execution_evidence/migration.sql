CREATE TABLE "tool_executions" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "args" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "exitCode" INTEGER,
    "stdout" TEXT NOT NULL DEFAULT '',
    "stderr" TEXT NOT NULL DEFAULT '',
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_executions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tool_executions_analysisRunId_idx" ON "tool_executions"("analysisRunId");
CREATE INDEX "tool_executions_status_idx" ON "tool_executions"("status");

ALTER TABLE "tool_executions" ADD CONSTRAINT "tool_executions_analysisRunId_fkey"
    FOREIGN KEY ("analysisRunId") REFERENCES "analysis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
