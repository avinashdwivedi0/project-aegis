import crypto from "node:crypto";

type PatchContext = {
  filePath: string;
  fileContent: string;
  finding: {
    startLine?: number | null;
    endLine?: number | null;
    recommendedFix?: string | null;
  };
};

export async function generate(
  context: PatchContext,
) {
  const lines = context.fileContent.split("\n");
  const start = Math.max((context.finding.startLine ?? 1) - 1, 0);
  const end = Math.min(
    context.finding.endLine ?? start + 1,
    lines.length,
  );
  const replacement = context.finding.recommendedFix ?? "";
  const removed = lines.slice(start, end);
  const diffContent = [
    `--- a/${context.filePath}`,
    `+++ b/${context.filePath}`,
    `@@ -${start + 1},${removed.length} +${start + 1},1 @@`,
    ...removed.map((line) => `-${line}`),
    `+${replacement}`,
  ].join("\n") + "\n";

  return {
    diffContent,
    diffHash: crypto.createHash("sha256").update(diffContent).digest("hex"),
    linesAdded: replacement ? 1 : 0,
    linesRemoved: removed.length,
  };
}

export const PatchGenerator = { generate };