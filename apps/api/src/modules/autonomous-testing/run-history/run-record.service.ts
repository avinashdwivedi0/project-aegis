import { Prisma } from "@prisma/client";

import { prisma } from "../../../config/prisma.js";

type RunRecordInput = {
  repositoryId: string;
  runId: string;
  kind: string;
  suite?: string;
  mode?: string;
  status: string;
  result: unknown;
};

export class RunRecordService {
  async save(input: RunRecordInput) {
    const result = JSON.parse(JSON.stringify(input.result)) as Prisma.InputJsonValue;
    return prisma.autonomousTestRun.create({
      data: {
        repositoryId: input.repositoryId,
        runId: input.runId,
        kind: input.kind,
        suite: input.suite,
        mode: input.mode,
        status: input.status,
        result,
      },
      select: { id: true, runId: true, createdAt: true },
    });
  }
}

export const runRecordService = new RunRecordService();
