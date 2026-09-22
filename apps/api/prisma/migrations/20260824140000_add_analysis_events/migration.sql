CREATE TABLE "analysis_events" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "stage" TEXT,
    "message" TEXT,
    "progress" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "analysis_events_analysisRunId_createdAt_idx" ON "analysis_events"("analysisRunId", "createdAt");
CREATE INDEX "analysis_events_type_idx" ON "analysis_events"("type");

ALTER TABLE "analysis_events" ADD CONSTRAINT "analysis_events_analysisRunId_fkey"
    FOREIGN KEY ("analysisRunId") REFERENCES "analysis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
