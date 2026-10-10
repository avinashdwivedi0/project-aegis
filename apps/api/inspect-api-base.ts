import "./src/config/env";
import { prisma } from "./src/config/prisma";
import fs from "node:fs/promises";
const run = await prisma.analysisRun.findFirst({ where: { repository: { name: "MONGO_UR" } }, orderBy: { createdAt: "desc" }, select: { repository: { select: { workspacePath: true } } } });
const root = run?.repository.workspacePath;
if (root) console.log((await fs.readFile(`${root}/frontend/js/api.js`, "utf8")).slice(0, 2500));
await prisma.$disconnect();
