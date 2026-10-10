import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { javascriptRouteDiscoveryService } from "../src/modules/autonomous-testing/integration/javascript-route-discovery.service.js";
import { signupIntegrationGenerator } from "../src/modules/autonomous-testing/integration/signup-integration.generator.js";
import { orderIntegrationGenerator } from "../src/modules/autonomous-testing/integration/order-integration.generator.js";
import { reactFlowDiscoveryService } from "../src/modules/autonomous-testing/black-box/react-flow-discovery.service.js";
import { signupLoginPlaywrightGenerator } from "../src/modules/autonomous-testing/black-box/signup-login-playwright.generator.js";

const repository = path.resolve(process.argv[2] ?? "C:/aegis/repo-2662ae14442f7d86");
const routes = await javascriptRouteDiscoveryService.discover(repository);
const flows = await reactFlowDiscoveryService.discoverSignupLogin(repository);
const outputDirectory = path.resolve("results");
const integrationDirectory = path.join(outputDirectory, "phase2-integration");
const blackBoxDirectory = path.join(outputDirectory, "phase3-black-box");
await Promise.all([
  mkdir(integrationDirectory, { recursive: true }),
  mkdir(blackBoxDirectory, { recursive: true }),
]);

const files = [
  {
    path: path.join(integrationDirectory, "signup.generated.test.cjs"),
    content: signupIntegrationGenerator.generate(routes.routes, "http://host.docker.internal:3002"),
  },
  {
    path: path.join(integrationDirectory, "new-order.generated.test.cjs"),
    content: orderIntegrationGenerator.generate(routes.routes, "http://host.docker.internal:3002"),
  },
  {
    path: path.join(blackBoxDirectory, "signup-login.generated.spec.ts"),
    content: signupLoginPlaywrightGenerator.generate(flows, {
      frontend: "http://host.docker.internal:3001",
      dashboard: "http://host.docker.internal:3003",
    }),
  },
];

for (const file of files) await writeFile(file.path, file.content, "utf8");
console.log(JSON.stringify({
  repository,
  generatedFromExistingGenerators: files.map(({ path: filePath, content }) => ({
    path: filePath,
    criticalTags: content.match(/@critical/g)?.length ?? 0,
    testTitles: [...content.matchAll(/test\(["'`]([^"'`]+)["'`]/g)].map((match) => match[1]),
  })),
}, null, 2));
