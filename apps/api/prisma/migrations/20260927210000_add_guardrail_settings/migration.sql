-- Add GuardrailSettings model: per-project advisory guardrail configuration.
-- Scope is ADVISORY by default — settings are NOT enforced server-side until
-- scope is flipped to ENFORCED and repair.service.ts implements the checks.

CREATE TYPE "GuardrailScope" AS ENUM ('ADVISORY', 'ENFORCED');

CREATE TABLE "guardrail_settings" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "maxPatchRiskScore" INTEGER NOT NULL DEFAULT 75,
    "requireManualApprovalForCritical" BOOLEAN NOT NULL DEFAULT false,
    "sandboxOnly" BOOLEAN NOT NULL DEFAULT false,
    "scope" "GuardrailScope" NOT NULL DEFAULT 'ADVISORY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guardrail_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "guardrail_settings_projectId_key" UNIQUE ("projectId")
);

CREATE INDEX "guardrail_settings_projectId_idx" ON "guardrail_settings"("projectId");