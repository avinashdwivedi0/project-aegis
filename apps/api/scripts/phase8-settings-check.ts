import assert from "node:assert/strict";
import crypto from "node:crypto";

import { prisma } from "../src/config/prisma";
import { AuthService } from "../src/modules/auth/auth.service";

const email = `phase8-settings-${crypto.randomUUID()}@example.test`;
let userId: string | undefined;

try {
  const user = await prisma.user.create({
    data: {
      name: "Phase 8 Settings",
      email,
      passwordHash: "phase8-test-only",
    },
  });
  userId = user.id;

  const updated = await AuthService.updatePreferences(user.id, {
    defaultRef: "release/1.0",
    polling: false,
  });
  assert.deepEqual(updated.preferences, {
    defaultRef: "release/1.0",
    polling: false,
  });

  const current = await AuthService.getCurrentUser(user.id);
  assert.equal(current?.preferences && typeof current.preferences === "object" ? (current.preferences as { defaultRef?: string }).defaultRef : undefined, "release/1.0");
  console.log("Phase 8 settings check passed.");
} finally {
  if (userId) await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
}