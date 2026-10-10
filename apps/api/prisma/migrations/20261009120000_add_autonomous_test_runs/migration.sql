CREATE TABLE "autonomous_test_runs" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "suite" TEXT,
    "mode" TEXT,
    "status" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "autonomous_test_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "autonomous_test_runs_runId_key" ON "autonomous_test_runs"("runId");
CREATE INDEX "autonomous_test_runs_repositoryId_createdAt_idx" ON "autonomous_test_runs"("repositoryId", "createdAt");

ALTER TABLE "autonomous_test_runs"
ADD CONSTRAINT "autonomous_test_runs_repositoryId_fkey"
FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
