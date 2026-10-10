import { prisma } from "../../config/prisma";

export class AuditLogService {
  static async createAuditLog(
    actorId: string,
    action: string,
    targetType: string,
    targetId: string,
    metadata: Record<string, any> = {},
    success: boolean = true
  ) {
    return prisma.auditLog.create({
      data: {
        actorId,
        action,
        targetType,
        targetId,
        metadata,
        success,
      },
    });
  }

  static async getAuditLogs(
    ownerId: string,
    limit = 100,
    offset = 0,
    actorId?: string,
    targetType?: string,
    targetId?: string,
    success?: boolean,
  ) {
    const where: any = { actorId: ownerId };
    if (actorId && actorId !== ownerId) where.actorId = "__no_matching_actor__";
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;
    if (success !== undefined) where.success = success;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          actorId: true,
          action: true,
          targetType: true,
          targetId: true,
          metadata: true,
          success: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }
}
