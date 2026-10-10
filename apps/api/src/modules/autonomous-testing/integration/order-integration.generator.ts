import type { DiscoveredHttpRoute } from "./integration.types.js";

export class OrderIntegrationGenerator {
  generate(routes: DiscoveredHttpRoute[], baseUrl: string): string {
    const orderRoute = routes.find((route) => route.method === "POST" && route.path === "/newOrder");
    if (!orderRoute || !/OrdersModel/.test(orderRoute.handlerSource)) {
      throw new Error("No OrdersModel-backed /newOrder boundary was discovered.");
    }

    return `// Generated from the discovered POST /newOrder handler and its OrdersModel boundary.
// A companion MongoDB query verifies the logged order name exists in the real test database.
const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const baseUrl = process.env.BASE_URL || ${JSON.stringify(baseUrl)};

test("@critical POST /newOrder returns the observed success status and response body", async () => {
  const order = { name: \`PHASE2-\${randomUUID()}\`, qty: 7, price: 123.45, mode: "CNC" };
  const response = await fetch(new URL("/newOrder", baseUrl), {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(order),
  });
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.equal(body, "Order saved!");
  console.log(JSON.stringify({ persistedOrderName: order.name }));
});
`;
  }
}

export const orderIntegrationGenerator = new OrderIntegrationGenerator();
