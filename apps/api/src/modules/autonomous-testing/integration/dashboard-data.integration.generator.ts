import type { DiscoveredHttpRoute } from "./integration.types.js";

export class DashboardDataIntegrationGenerator {
  generate(routes: DiscoveredHttpRoute[], baseUrl: string): string {
    const required = [
      ["GET", "/addHoldings"], ["GET", "/addPositions"],
      ["GET", "/allHoldings"], ["GET", "/allPositions"], ["POST", "/forgot-password"],
    ] as const;
    for (const [method, routePath] of required) {
      const route = routes.find((candidate) => candidate.method === method && candidate.path === routePath);
      if (!route) throw new Error(`Required route ${method} ${routePath} was not discovered from repository source.`);
      if (routePath === "/addHoldings" && !/HoldingsModel/.test(route.handlerSource)) throw new Error("GET /addHoldings is not confirmed to write HoldingsModel records.");
      if (routePath === "/addPositions" && !/PositionsModel/.test(route.handlerSource)) throw new Error("GET /addPositions is not confirmed to write PositionsModel records.");
      if (routePath === "/allHoldings" && !/HoldingsModel\.find/.test(route.handlerSource)) throw new Error("GET /allHoldings is not confirmed to read HoldingsModel.");
      if (routePath === "/allPositions" && !/PositionsModel\.find/.test(route.handlerSource)) throw new Error("GET /allPositions is not confirmed to read PositionsModel.");
      if (routePath === "/forgot-password" && !/UserModel\.findOne/.test(route.handlerSource)) throw new Error("POST /forgot-password is not confirmed to query UserModel.");
    }

    return `// Generated only after source discovery confirmed all five handlers in backend/index.js.
// WARNING: GET /addHoldings and GET /addPositions write seed rows; run only with a disposable target database.
const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const baseUrl = process.env.BASE_URL || ${JSON.stringify(baseUrl)};

test("GET /addHoldings writes the observed seed records and returns Done!", async () => {
  const response = await fetch(new URL("/addHoldings", baseUrl));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "Done!");
  let rows = [];
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const listing = await fetch(new URL("/allHoldings", baseUrl));
    assert.equal(listing.status, 200);
    rows = await listing.json();
    if (Array.isArray(rows) && rows.some((row) => row.name === "BHARTIARTL")) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(Array.isArray(rows));
  assert.ok(rows.some((row) => row.name === "BHARTIARTL"));
});

test("GET /addPositions writes the observed seed records and returns Done!", async () => {
  const response = await fetch(new URL("/addPositions", baseUrl));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "Done!");
  let rows = [];
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const listing = await fetch(new URL("/allPositions", baseUrl));
    assert.equal(listing.status, 200);
    rows = await listing.json();
    if (Array.isArray(rows) && rows.some((row) => row.name === "EVEREADY")) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(Array.isArray(rows));
  assert.ok(rows.some((row) => row.name === "EVEREADY"));
});

test("GET /allHoldings and /allPositions return arrays of persisted dashboard rows", async () => {
  const [holdingsResponse, positionsResponse] = await Promise.all([
    fetch(new URL("/allHoldings", baseUrl)), fetch(new URL("/allPositions", baseUrl)),
  ]);
  assert.equal(holdingsResponse.status, 200);
  assert.equal(positionsResponse.status, 200);
  assert.ok(Array.isArray(await holdingsResponse.json()));
  assert.ok(Array.isArray(await positionsResponse.json()));
});

test("POST /forgot-password returns the observed missing-account response", async () => {
  const response = await fetch(new URL("/forgot-password", baseUrl), {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "missing-" + randomUUID() + "@example.test" }),
  });
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { message: "No account found with that email" });
});
`;
  }
}

export const dashboardDataIntegrationGenerator = new DashboardDataIntegrationGenerator();
