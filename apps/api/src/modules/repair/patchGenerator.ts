service src/modules/repair/patchGenerator.ts {
  import { diff } from "diff";
  import crypto from "crypto";
  import type { Finding, Patch } from "./repair.types";

  /**
   * Enhanced patch generator that returns a unified diff + auxiliary data.
   *
   * @param finding – the finding for which we need a patch
   * @param source  – the current source file content
   * @param fixText – suggested replacement text (or null to infer)
   *
   * @returns Patch object (diffContent, diffHash, addedLines, removedLines)
   */
  export async function generate(
    finding: Finding,
    source: string
  ): Promise<Patch> {
    // ---------------------------------------------------------------
    // 1️⃣  Locate the lines that surround the issue.
    // ---------------------------------------------------------------
    const lines = source.split("\n");
    const start = Math.max(finding.startLine ?? 0, 0);
    const end = Math.min(finding.endLine ?? start + 5, lines.length);
    const contextBefore = lines.slice(0, start).join("\n");
    const contextAfter = lines.slice(end).join("\n");

    // Slice that represents the “broken” code
    const broken = lines.slice(start, end).join("\n");

    // ---------------------------------------------------------------
    // 2️⃣  Build the proposed replacement.
    // ---------------------------------------------------------------
    // If a recommendedFix is supplied we can directly use it; otherwise
    // we fall back to a very simple placeholder.
    const replacement = finding.recommendedFix ?? "// TODO: fix suggestion";

    // Replace only the snippet – we keep surrounding context untouched.
    const patched = [
      ...lines.slice(0, start),
      replacement,
      ...lines.slice(end),
    ];
    const patchedContent = patched.join("\n");

    // ---------------------------------------------------------------
    // 3️⃣  Build a unified diff.
    // ---------------------------------------------------------------
    const diffString = diff({
      a: broken,
      b: replacement,
      diffLanguage: true, // true => unified diff format
    }).map((part) => part.addedOrRemoved ? part.value : null).filter(Boolean);

    // The diff library returns an array of strings that already contain
    // the +/- markers and spacing. Join them to a single patch string.
    const diffContent = diffString.join("\n");

    // ---------------------------------------------------------------
    // 4️⃣  Compute auxiliary data.
    // ---------------------------------------------------------------
    const addedLines = diffContent.split("\n").filter((l) => l.startsWith("+")).length - 1; // -1 for leading +
    const removedLines = diffContent.split("\n").filter((l) => l.startsWith("-")).length - 1; // -1 for leading -

    const diffHash = crypto
      .createHash("sha256")
      .update(diffContent)
      .digest("hex");

    return {
      diffContent,
      diffHash,
      linesAdded: addedLines,
      linesRemoved,
    };
  }

  /**
   * Helper to retrieve the raw source file content for a given repo+file.
   * In a real system this would pull from git or from a DB record.
   */
  export async function getFileContent(
    repositoryId: string,
    filePath: string
  ): Promise<string> {
    // placeholder implementation – actual data would come from the DB
    const repoFile = await prisma.repositoryFile.findFirst({
      where: { repositoryId, path: filePath },
      select: { content: true },
    });
    return repoFile?.content ?? "";
  }
}