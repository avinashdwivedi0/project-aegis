ALTER TABLE "analysis_events" ADD COLUMN "agentRole" VARCHAR(20);
CREATE INDEX "analysis_events_agentRole_idx" ON "analysis_events"("agentRole");
