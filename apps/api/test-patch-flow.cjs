const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { RepairService } = require('./src/modules/repair/repair.service');

async function testPatchFlow() {
  const runId = 'cmucgjd340017iiowll4diudv';
  const ownerId = 'cmuc6r3ek0000iirg90pmhnok';

  try {
    // Get findings for this run
    const findings = await prisma.finding.findMany({
      where: { analysisRunId: runId },
      select: { id: true },
    });
    console.log(`Found ${findings.length} findings for run ${runId}`);
    if (findings.length < 2) {
      throw new Error('Need at least 2 findings to test patch flow');
    }

    const findingId1 = findings[0].id;
    const findingId2 = findings[1].id;
    console.log(`Using finding IDs: ${findingId1} and ${findingId2}`);

    // Generate patch for first finding
    console.log(`Generating patch for finding ${findingId1}...`);
    const patch1 = await RepairService.generatePatch(findingId1, ownerId, {});
    console.log(`Generated patch ${patch1.patchId} for finding ${findingId1}`);

    // Generate patch for second finding
    console.log(`Generating patch for finding ${findingId2}...`);
    const patch2 = await RepairService.generatePatch(findingId2, ownerId, {});
    console.log(`Generated patch ${patch2.patchId} for finding ${findingId2}`);

    // Reject patch for second finding
    console.log(`Rejecting patch ${patch2.patchId}...`);
    const rejectResult = await RepairService.rejectPatch(patch2.patchId, ownerId);
    console.log(`Rejected patch ${patch2.patchId}:`, rejectResult);

    // Now check audit log for the last 5 entries
    const auditLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        actorId: true,
        action: true,
        targetType: true,
        targetId: true,
        success: true,
        createdAt: true,
      },
    });
    console.log('\\nLast 5 audit log entries:');
    for (const log of auditLogs) {
      console.log(`${log.createdAt} | ${log.actorId} | ${log.action} | ${log.targetType} | ${log.targetId} | success=${log.success}`);
    }

    // Verify we have PATCH_GENERATE and PATCH_REJECT entries
    const generateLog = auditLogs.find(l => l.action === 'PATCH_GENERATE');
    const rejectLog = auditLogs.find(l => l.action === 'PATCH_REJECT');
    if (generateLog) {
      console.log(`\\n✅ Found PATCH_GENERATE entry: actorId=${generateLog.actorId}, success=${generateLog.success}`);
    } else {
      console.log(`\\n❌ Missing PATCH_GENERATE entry`);
    }
    if (rejectLog) {
      console.log(`✅ Found PATCH_REJECT entry: actorId=${rejectLog.actorId}, success=${rejectLog.success}`);
    } else {
      console.log(`❌ Missing PATCH_REJECT entry`);
    }

  } catch (err) {
    console.error('Error in patch flow:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testPatchFlow();