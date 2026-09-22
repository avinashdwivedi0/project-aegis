import assert from "node:assert/strict";

import { GitHubService } from "../src/modules/repositories/github.service";

await assert.rejects(
  GitHubService.createPullRequest(
    "https://example.com/org/repo",
    "aegis/repair-fixture",
    "token",
    "Repair fixture",
    "",
  ),
  /Only GitHub repository URLs/,
);
await assert.rejects(
  GitHubService.createPullRequest(
    "https://github.com/org/repo",
    "main",
    "token",
    "Repair fixture",
    "",
  ),
  /Aegis repair branches/,
);
await assert.rejects(
  GitHubService.createPullRequest(
    "https://github.com/org/repo",
    "aegis/repair-fixture",
    "",
    "Repair fixture",
    "",
  ),
  /GitHub token is required/,
);

console.log("Phase 8 GitHub delivery check passed.");
