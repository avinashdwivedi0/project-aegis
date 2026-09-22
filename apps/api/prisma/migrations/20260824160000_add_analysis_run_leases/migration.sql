ALTER TABLE "analysis_runs" ADD COLUMN "leaseOwner" TEXT;
ALTER TABLE "analysis_runs" ADD COLUMN "leaseExpiresAt" TIMESTAMP(3);

CREATE INDEX "analysis_runs_leaseExpiresAt_idx" ON "analysis_runs"("leaseExpiresAt");
