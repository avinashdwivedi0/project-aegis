import { prisma } from "../src/config/prisma.js";

async function checkProjects() {
  console.log("=== Projects ===");
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      ownerId: true,
      repositories: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
  console.log(JSON.stringify(projects, null, 2));

  console.log("\n=== Analysis Runs with Owner ===");
  const runs = await prisma.analysisRun.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      projectId: true,
      repositoryId: true,
      status: true,
      createdAt: true,
      project: {
        select: {
          ownerId: true
        }
      }
    }
  });
  console.log(JSON.stringify(runs, null, 2));
}

checkProjects().catch(console.error);
