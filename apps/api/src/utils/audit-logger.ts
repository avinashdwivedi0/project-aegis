import { AuditLogService } from "../modules/audit/audit.service";

/**
 * AuditLogger – thin wrapper around AuditLogService.createAuditLog.
 *
 * Records governance actions (bridge creation, patch generation, patch rejection,
 * validation, application) with the authenticated actor's id, target entity,
 * and a success/failure flag.  Failures are logged too, so audit trails are
 * append-only and complete.
 *
 * Usage:
 *   AuditLogger.record(actorId, "PATCH_GENERATE", "Patch", patchId, { findingId });
 *   AuditLogger.record(actorId, "BRIDGE_CREATE", "AnalysisRun", runId, { ok: true }, false);
 */
export class AuditLogger {
  static async record(
    actorId: string,
    action: string,
    targetType: string,
    targetId: string,
    metadata: Record<string, any> = {},
    success: boolean = true,
  ): Promise<void> {
    try {
      await AuditLogService.createAuditLog(
        actorId,
        action,
        targetType,
        targetId,
        metadata,
        success,
      );
    } catch (err) {
      // Audit logging must never break the primary action.
      console.error("[AuditLogger] failed to record audit entry:", err);
    }
  }
}