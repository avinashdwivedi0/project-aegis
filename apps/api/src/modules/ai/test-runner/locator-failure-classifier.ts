const LOCATOR_EXPRESSION = String.raw`(?:locator\s*\(|selector\b|getBy(?:Role|Text|Label|Placeholder|TestId|Title|AltText)\s*\()`;

const LOCATOR_CONTEXT = new RegExp(
  String.raw`(?:waiting for|Locator:)\s*${LOCATOR_EXPRESSION}`,
  "i",
);
const STRICT_MODE_LOCATOR = new RegExp(
  String.raw`strict mode violation:\s*${LOCATOR_EXPRESSION}`,
  "i",
);
const EXPLICIT_RESOLUTION_FAILURE = /<element\(s\) not found>|resolved to 0 elements|strict mode violation:[\s\S]*?resolved to (?:[2-9]|[1-9]\d+) elements/i;

/** True only when Playwright identifies a locator and reports no/ambiguous matches. */
export function isLocatorFailure(message: string): boolean {
  const hasLocator = LOCATOR_CONTEXT.test(message) || STRICT_MODE_LOCATOR.test(message);
  return hasLocator && EXPLICIT_RESOLUTION_FAILURE.test(message);
}
