import assert from "node:assert/strict";
import test from "node:test";

import { isLocatorFailure } from "./locator-failure-classifier";

const cases = [
  {
    name: "locator not found (captured Playwright output)",
    expected: true,
    message: `Error: expect(locator).toBeVisible() failed

Locator:  getByText('content')
Expected: visible
Received: <element(s) not found>
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('content')`,
  },
  {
    name: "strict-mode locator ambiguity",
    expected: true,
    message: `Error: locator.click: Error: strict mode violation: getByRole('button') resolved to 2 elements:
    1) <button>Save</button>
    2) <button>Cancel</button>`,
  },
  {
    name: "plain timeout without locator resolution evidence",
    expected: false,
    message: "TimeoutError: page.waitForTimeout: Timeout 5000ms exceeded.",
  },
  {
    name: "network navigation failure",
    expected: false,
    message: "Error: page.goto: net::ERR_CONNECTION_REFUSED at https://example.com",
  },
  {
    name: "ordinary assertion mismatch",
    expected: false,
    message: "Error: expect(received).toBe(expected)\nExpected: 4\nReceived: 3",
  },
] as const;

for (const sample of cases) {
  test(sample.name, () => {
    const actual = isLocatorFailure(sample.message);
    console.log(`${sample.name}: expected=${sample.expected} actual=${actual}`);
    assert.equal(actual, sample.expected);
  });
}
