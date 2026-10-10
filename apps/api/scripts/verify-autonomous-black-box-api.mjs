import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const apiBase = process.env.AEGIS_API_BASE ?? "http://127.0.0.1:3000/api";
const workspacePath = process.argv[2];
if (!workspacePath) throw new Error("Pass a real repository workspace path.");
const suffix = randomUUID();
const email = `autonomous-blackbox-${suffix}@example.test`;
const password = `Aegis-${suffix}!`;
const prisma = new PrismaClient();
let userId;

async function post(path, body, token) {
  return fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

try {
  const registrationResponse = await post("/auth/register", {
    name: "Autonomous Black Box Verification",
    email,
    password,
  });
  const registration = await registrationResponse.json();
  if (!registrationResponse.ok) throw new Error(`Registration ${registrationResponse.status}: ${JSON.stringify(registration)}`);
  userId = registration.data.user.id;
  const token = registration.data.token;

  const projectResponse = await post("/projects", { name: `Autonomous black box ${suffix.slice(0, 8)}` }, token);
  const project = await projectResponse.json();
  if (!projectResponse.ok) throw new Error(`Project ${projectResponse.status}: ${JSON.stringify(project)}`);

  const repositoryResponse = await post(`/projects/${project.data.id}/repositories`, {
    name: "Real signup/login source repository",
    provider: "LOCAL",
    workspacePath,
  }, token);
  const repository = await repositoryResponse.json();
  if (!repositoryResponse.ok) throw new Error(`Repository ${repositoryResponse.status}: ${JSON.stringify(repository)}`);

  const runResponse = await post("/autonomous-testing/black-box/run", {
    repositoryId: repository.data.id,
    frontendUrl: process.env.FRONTEND_URL ?? "http://host.docker.internal:3121",
    dashboardUrl: process.env.DASHBOARD_URL ?? "http://host.docker.internal:3122",
  }, token);
  const runBody = await runResponse.json();
  console.log(JSON.stringify({
    request: {
      method: "POST",
      path: "/api/autonomous-testing/black-box/run",
      body: {
        repositoryId: repository.data.id,
        frontendUrl: process.env.FRONTEND_URL ?? "http://host.docker.internal:3121",
        dashboardUrl: process.env.DASHBOARD_URL ?? "http://host.docker.internal:3122",
      },
    },
    httpStatus: runResponse.status,
    response: runBody,
  }, null, 2));
  if (!runResponse.ok) process.exitCode = 1;
} finally {
  if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  await prisma.$disconnect();
}
