const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runBridge() {
  const runId = 'cmucgjd340017iiowll4diudv';
  const ownerId = 'cmuc6r3ek0000iirg90pmhnok';

  try {
    console.log(`Running bridge for run ${runId}`);

    // Mark bridge as pending at start
    await prisma.analysisRun.update({
      where: { id: runId },
      data: { bridgeStatus: 'PENDING', bridgeError: null },
    });
    console.log('Marked bridge as PENDING');

    // Idempotency check
    const existingJob = await prisma.repairJob.findFirst({
      where: { analysisRunId: runId },
      select: { id: true },
    });
    if (existingJob) {
      await prisma.analysisRun.update({
        where: { id: runId },
        data: { bridgeStatus: 'COMPLETED' },
      });
      console.log('Existing job found');
      return;
    }

    // Load the run
    const run = await prisma.analysisRun.findUnique({
      where: { id: runId },
      select: { id: true, projectId: true, repositoryId: true, ref: true, project: { select: { ownerId: true } } },
    });
    if (!run || run.project.ownerId !== ownerId) {
      throw new Error('Analysis run not found or access denied.');
    }

    // Delete existing job for this run (re-run test)
    await prisma.repairJob.deleteMany({ where: { analysisRunId: runId } });

    const executions = await prisma.toolExecution.findMany({
      where: { analysisRunId: runId },
      orderBy: { createdAt: "asc" },
      select: { command: true, evidence: true },
    });
    console.log(`Found ${executions.length} tool executions`);

    // Build findings
    const rawFindings = [];
    for (const execution of executions) {
      const evidence = Array.isArray(execution.evidence) ? execution.evidence : [];
      for (const item of evidence) {
        const syntheticKey = item.id ?? `${execution.command}:${item.message ?? "finding"}`;
        rawFindings.push({
          sourceFindingKey: syntheticKey,
          category: item.tool ?? execution.command,
          severity: item.severity ?? "info",
          message: item.message ?? "Evidence reported.",
          repairRequired: item.repairRequired ?? false,
        });
      }
    }
    console.log(`Built ${rawFindings.length} raw findings`);

    const repairable = rawFindings.filter(f => f.repairRequired);
    console.log(`Found ${repairable.length} repairable findings`);

    if (repairable.length === 0) {
      await prisma.analysisRun.update({ where: { id: runId }, data: { bridgeStatus: 'COMPLETED' } });
      return { created: false, reason: 'no_repairable_findings' };
    }

    // Create RepairJob
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

    // Create Finding rows
    await prisma.finding.createMany({
      data: repairable.map(f => ({
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

    // Mark bridge completed
    await prisma.analysisRun.update({
      where: { id: runId },
      data: { bridgeStatus: 'COMPLETED' },
    });

    // Create audit log
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
    console.log('Created audit log');

    return { jobId: job.id, created: true, findingCount: repairable.length };
  } catch (err) {
    console.error('Bridge error:', err);
    await prisma.analysisRun.update({
      where: { id: runId },
      data: { bridgeStatus: 'FAILED', bridgeError: String(err).slice(0, 500) },
    });
    await prisma.auditLog.create({
      data: {
        actorId: ownerId,
        action: 'BRIDGE_CREATE',
        targetType: 'AnalysisRun',
        targetId: runId,
        metadata: { reason: String(err).slice(0, 200) },
        success: false,
      },
    });
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

runBridge().then(r => console.log('Result:', JSON.stringify(r, null, 2)));