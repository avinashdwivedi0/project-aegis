const test = require("node:test");
const assert = require("node:assert/strict");

 test("records a controlled failing test", () => {
  assert.equal(2 + 2, 5);
});
