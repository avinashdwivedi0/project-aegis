ALTER TABLE "self_healing_proposals"
ADD COLUMN "parentProposalId" TEXT;

CREATE INDEX "self_healing_proposals_parentProposalId_idx"
ON "self_healing_proposals"("parentProposalId");

ALTER TABLE "self_healing_proposals"
ADD CONSTRAINT "self_healing_proposals_parentProposalId_fkey"
FOREIGN KEY ("parentProposalId") REFERENCES "self_healing_proposals"("id")
ON DELETE SET NULL ON UPDATE CASCADE;