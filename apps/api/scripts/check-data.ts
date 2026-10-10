import { prisma } from "../src/config/prisma.js";

async function checkData() {
  console.log("=== Analysis Runs ===");
  const runs = await prisma.analysisRun.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      projectId: true,
      repositoryId: true,
      status: true,
      createdAt: true,
      repository: {
        select: {
          name: true
        }
      }
    }
  });
  console.log(JSON.stringify(runs, null, 2));

  console.log("\n=== Audit Logs (Last 20) ===");
  const logs = await prisma.auditLog.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      actorId: true,
      action: true,
      targetType: true,
      targetId: true,
      createdAt: true
    }
  });
  console.log(JSON.stringify(logs, null, 2));

  console.log("\n=== Self-Healing Proposals ===");
  const proposals = await prisma.selfHealingProposal.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      repositoryId: true,
      failedLocator: true,
      status: true,
      confidence: true,
      reasoning: true,
      createdAt: true,
      repository: {
        select: {
          name: true
        }
      }
    }
  });
  console.log(JSON.stringify(proposals, null, 2));
}

checkData().catch(console.error);
