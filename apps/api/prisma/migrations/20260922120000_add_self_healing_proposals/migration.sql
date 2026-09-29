CREATE TABLE "self_healing_proposals" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "testRunId" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "failedLocator" TEXT NOT NULL,
    "domSnapshot" TEXT NOT NULL,
    "screenshot" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "proposedLocator" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "self_healing_proposals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "self_healing_proposals_repositoryId_status_idx"
ON "self_healing_proposals"("repositoryId", "status");

CREATE INDEX "self_healing_proposals_testRunId_idx"
ON "self_healing_proposals"("testRunId");

ALTER TABLE "self_healing_proposals"
ADD CONSTRAINT "self_healing_proposals_repositoryId_fkey"
FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id")
ON DELETE CASCADE ON UPDATE CASCADE;