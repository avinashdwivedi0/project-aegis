const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBridge() {
  const runId = 'cmuc8qk9m0001iitg5fww9vzi';
  const ownerId = 'cmuc6r3ek0000iirg90pmhnok';

  try {
    console.log(`Testing bridge for run ${runId} with owner ${ownerId}`);

    // Mark bridge as pending at start
    await prisma.analysisRun.update({
      where: { id: runId },
      data: { bridgeStatus: 'PENDING', bridgeError: null },
    });
    console.log('Marked bridge as PENDING');

    // --- Idempotency check ---
    const existingJob = await prisma.repairJob.findFirst({
      where: { analysisRunId: runId },
      select: { id: true },
    });
    if (existingJob) {
      await prisma.analysisRun.update({
        where: { id: runId },
        data: { bridgeStatus: 'COMPLETED' },
      });
      console.log('Existing job found, marked COMPLETED');
      return { jobId: existingJob.id, created: false, findingCount: 0 };
    }

    // --- Load the run + its tool executions ---
    const run = await prisma.analysisRun.findFirst({
      where: { id: runId, project: { ownerId } },
      select: { id: true, projectId: true, repositoryId: true, ref: true },
    });
    if (!run) {
      throw new Error(`Analysis run not found or access denied.`);
    }
    console.log('Run loaded:', run.id);

    const executions = await prisma.toolExecution.findMany({
      where: { analysisRunId: runId },
      orderBy: { createdAt: "asc" },
      select: { command: true, evidence: true },
    });
    console.log(`Found ${executions.length} tool executions`);

    // --- Build findings, replicating FindingService.list() synthetic key ---
    const rawFindings = [];

    for (const execution of executions) {
      const evidence = Array.isArray(execution.evidence)
        ? execution.evidence
        : [];

      for (const item of evidence) {
        const syntheticKey =
          item.id ?? `${execution.command}:${item.message ?? "finding"}`;

        rawFindings.push({
          sourceFindingKey: syntheticKey,
          category: item.tool ?? execution.command,
          severity: item.severity ?? "info",
          message: item.message ?? "Evidence reported by deterministic tool.",
          repairRequired: item.repairRequired ?? false,
        });
      }
    }

    console.log(`Built ${rawFindings.length} raw findings`);

    // --- Keep only findings that the agent flagged as repair-needed ---
    const repairable = rawFindings.filter((f) => f.repairRequired);
    console.log(`Found ${repairable.length} repairable findings`);

    if (repairable.length === 0) {
      await prisma.analysisRun.update({
        where: { id: runId },
        data: { bridgeStatus: 'COMPLETED' },
      });
      await prisma.auditLog.create({
        data: {
          actorId: ownerId,
          action: 'BRIDGE_CREATE',
          targetType: 'AnalysisRun',
          targetId: runId,
          metadata: { reason: 'no_repairable_findings', repairableCount: 0 },
          success: true,
        },
      });
      console.log('No repairable findings, marked COMPLETED and created audit log');
      return { jobId: null, created: false, findingCount: 0, reason: 'no_repairable_findings' };
    }

    // --- Create RepairJob ---
    const job = await prisma.repairJob.create({
      data: {
        analysisRunId: run.id,
        projectId: run.projectId,
        repositoryId: run.repositoryId ?? "",
        ref: run.ref ?? "HEAD",
        status: "COMPLETED",
      },
    });
    console.log(`Created repair job: ${job.id}`);

    // --- Create Finding rows in the repair domain ---
    await prisma.finding.createMany({
      data: repairable.map((f) => ({
        repairJobId: job.id,
        category: f.category,
        severity: f.severity,
        confidence: 0.8,
        title: f.message,
        description: f.message,
        evidence: [{ id: f.sourceFindingKey }],
        filePath: "repository",
        detectionSource: f.category,
        status: "OPEN",
        sourceFindingKey: f.sourceFindingKey,
        analysisRunId: run.id,
      })),
    });
    console.log(`Created ${repairable.length} findings`);

    // Mark bridge as completed
    await prisma.analysisRun.update({
      where: { id: runId },
      data: { bridgeStatus: 'COMPLETED' },
    });

    // Audit: bridge created successfully
    await prisma.auditLog.create({
      data: {
        actorId: ownerId,
        action: 'BRIDGE_CREATE',
        targetType: 'AnalysisRun',
        targetId: runId,
        metadata: { jobId: job.id, findingCount: repairable.length },
        success: true,
      },
    });

    return {
      jobId: job.id,
      created: true,
      findingCount: repairable.length,
    };
  } catch (err) {
    console.error('Bridge error:', err);
    // Mark bridge as failed with error message
    await prisma.analysisRun.update({
      where: { id: runId },
      data: {
        bridgeStatus: 'FAILED',
        bridgeError: String(err).slice(0, 500),
      },
    });
    // Audit: bridge creation failed
    await prisma.auditLog.create({
      data: {
        actorId: ownerId,
        action: 'BRIDGE_CREATE',
        targetType: 'AnalysisRun',
        targetId: runId,
        metadata: { reason: String(err).slice(0, 200), repairableCount: 0 },
        success: false,
      },
    });
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

testBridge()
  .then(result => {
    console.log('Final result:', JSON.stringify(result, null, 2));
  })
  .catch(err => {
    console.error('Unhandled error:', err);
  });