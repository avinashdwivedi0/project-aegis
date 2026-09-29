import { prisma } from "./src/config/prisma";
import { RepairBridgeService } from "./src/modules/analysis/repair-bridge.service";

(async () => {
  const runId = "cmucht0xt0001ii4kiic5anq1";
  const ownerId = "cmuc6r3ek0000iirg90pmhnok";
  try {
    const result = await RepairBridgeService.bridgeRunToRepairJob(ownerId, runId);
    console.log("Bridge result:", JSON.stringify(result, null, 2));

    const run = await prisma.analysisRun.findFirst({
      where: { id: runId },
      select: { id: true, status: true, bridgeStatus: true, bridgeError: true },
    });
    console.log("Run bridge status:", JSON.stringify(run, null, 2));

    const findings = await prisma.finding.findMany({
      where: { analysisRunId: runId },
      select: { id: true, sourceFindingKey: true, analysisRunId: true },
    });
    console.log("Findings count:", findings.length, findings);
  } catch (err) {
    console.error("Bridge error:", err);
  } finally {
    await prisma.$disconnect();
  }
})();