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
    limit = 100,
    offset = 0,
    actorId?: string,
    targetType?: string,
    targetId?: string
  ) {
    const where: any = {};
    if (actorId) where.actorId = actorId;
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;

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