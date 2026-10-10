import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const targetFile = path.resolve(process.cwd(), "src/modules/ai/test-workflow/local-test-generator.service.ts");
let content = await readFile(targetFile, "utf8");

// Find and replace the specific block
const target = `        return [
          {
            number: 1,
            action: "Focus on the input field",
            expectedResult: "Input field is focused",
          },
          {
            number: 2,
            action: \`Type '\${text}' into the input field\`,
            expectedResult: "Input field contains '\${text}'",
          },
        ];`;

const replacement = `        return [{
          number: 1,
          action: \`Type '\${text}' into the input field\`,
          expectedResult: "Input field contains '\${text}'",
        }];`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  await writeFile(targetFile, content, "utf8");
  console.log("Replacement done!");
} else {
  console.log("Target not found - checking whitespace...");
  // Try with different whitespace
  const idx = content.indexOf("Focus on the input field");
  if (idx >= 0) {
    console.log("Found at index:", idx);
    console.log("Context:", content.substring(idx - 100, idx + 200));
  }
}
