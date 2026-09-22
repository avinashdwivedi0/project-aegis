import { prisma } from "../../config/prisma";

export type AnalysisEventInput = {
  analysisRunId: string;
  type: string;
  stage?: string;
  message?: string;
  progress?: number;
};

export class AnalysisEventService {
  static async record(input: AnalysisEventInput) {
    return prisma.analysisEvent.create({
      data: input,
    });
  }

  static async list(
    analysisRunId: string,
    after?: Date,
  ) {
    return prisma.analysisEvent.findMany({
      where: {
        analysisRunId,
        ...(after
          ? { createdAt: { gt: after } }
          : {}),
      },
      orderBy: [
        { createdAt: "asc" },
        { id: "asc" },
      ],
    });
  }
}
