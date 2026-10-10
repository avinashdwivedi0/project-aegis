export type EvidenceType = "unit" | "integration" | "black-box";

export type GeneratedArtifact = {
  label: string;
  load: () => Promise<string>;
};

export type TestEvidence = {
  id: string;
  title: string;
  summary: string;
  status: "passed" | "failed";
  result: string;
  injection: string;
  artifacts: GeneratedArtifact[];
};

export type EvidenceSection = {
  id: EvidenceType;
  title: string;
  subtitle: string;
  coverage: string;
  coverageDetail: string;
  gaps: string[];
  tests: TestEvidence[];
};

const loadRaw = async (load: () => Promise<{ default: string }>) => (await load()).default;

export const autonomousTestingEvidence: EvidenceSection[] = [
  {
    id: "unit",
    title: "Unit",
    subtitle: "Generated characterization checks against real exported code.",
    coverage: "5 exported functions",
    coverageDetail: "8 generated test cases across 5 exported functions",
    gaps: [
      "Expected behavior is characterized for these selected exports; the generator does not infer an oracle for arbitrary functions.",
      "Broader discovery and coverage across the repository remain pending.",
    ],
    tests: [
      {
        id: "password-helpers",
        title: "Password hashing and verification",
        summary: "hashPassword and verifyPassword from backend/index.js, exercised from their real source declarations without refactoring the target repository.",
        status: "passed",
        result: "5/5 cases passed: byte-for-byte hash, salt/digest sizes, correct password, wrong password, and malformed hashes.",
        injection: "A deliberately inverted password comparison was detected by the characterization run; target source was restored.",
        artifacts: [
          {
            label: "password.generated.test.cjs",
            load: () => loadRaw(() => import("../../../api/results/phase1-unit/password.generated.test.cjs?raw")),
          },
        ],
      },
      {
        id: "ui-components",
        title: "Exported dashboard and landing components",
        summary: "DoughnutChart, VerticalGraph, and Hero loaded from current target source with the target repository's real React/chart dependencies.",
        status: "passed",
        result: "Restored baseline: 3 passed, 0 failed. Each separate injected-bug run: 2 passed, 1 failed on the affected component assertion.",
        injection: "Verified catches: altered DoughnutChart data, altered VerticalGraph data, and changed Hero signup button text.",
        artifacts: [
          {
            label: "exported-components.generated.test.cjs",
            load: () => loadRaw(() => import("../../../api/results/phase1-exported-components/exported-components.generated.test.cjs?raw")),
          },
        ],
      },
    ],
  },
  {
    id: "integration",
    title: "Integration",
    subtitle: "Generated HTTP checks against the running service and disposable MongoDB.",
    coverage: "3 / 8 routes covered",
    coverageDetail: "Signup, login, and newOrder; 5 routes remain untested",
    gaps: [
      "Pending: addHoldings, addPositions, allHoldings, allPositions, forgot-password.",
      "The four holdings/positions routes are mostly read-only GETs; forgot-password remains untested too.",
    ],
    tests: [
      {
        id: "signup-login-api",
        title: "Signup and login persistence",
        summary: "Real signup, duplicate-signup, and login requests against the service and disposable MongoDB; assertions include HTTP status and response body.",
        status: "passed",
        result: "Restored baseline: 5 passed, 0 failed. Signup persisted a user; duplicate signup returned HTTP 409 with `User already exists`; login accepted the stored password and rejected a wrong one.",
        injection: "The duplicate-signup check verified the real HTTP 409 and exact `User already exists` response against the source handler. The deliberate injected persistence/response failure was verified on /newOrder below.",
        artifacts: [
          {
            label: "signup.generated.test.cjs",
            load: () => loadRaw(() => import("../../../api/results/phase2-integration/signup.generated.test.cjs?raw")),
          },
        ],
      },
      {
        id: "new-order-api",
        title: "Order persistence",
        summary: "POST /newOrder against the real service; the generated case checks the response, with a companion database query confirming the order row.",
        status: "passed",
        result: "Restored baseline: 1 passed, 0 failed. POST /newOrder returned HTTP 200 and `Order saved!`; the inserted order was confirmed in the disposable MongoDB.",
        injection: "Breaking order persistence/response behavior caused the generated integration test to fail; target source was restored and diff checked clean.",
        artifacts: [
          {
            label: "new-order.generated.test.cjs",
            load: () => loadRaw(() => import("../../../api/results/phase2-integration/new-order.generated.test.cjs?raw")),
          },
        ],
      },
    ],
  },
  {
    id: "black-box",
    title: "Black-box",
    subtitle: "An inferred signup-to-login user flow executed by the existing Playwright runner.",
    coverage: "1 verified flow",
    coverageDetail: "Frontend routes, actual form fields, labels, and actions",
    gaps: [
      "Additional inferred flows have not been generated or executed.",
      "The separate multi-clause TodoMVC flow remains NOT YET VERIFIED because the target host was unreachable through the configured proxy.",
    ],
    tests: [
      {
        id: "signup-login-ui",
        title: "Create an account, then log in",
        summary: "Uses actual signup fields and buttons, observes POST responses, then logs in with the created account and checks the dashboard redirect.",
        status: "passed",
        result: "Restored UI run: 1 passed, 0 failed. It ran against the real frontend, API, dashboard, and database.",
        injection: "Renaming the real signup CTA caused 0 passed, 1 failed (timed out waiting for the expected button). The fixed runner reports failed: 1; the UI was restored afterward.",
        artifacts: [
          {
            label: "signup-login.generated.spec.ts",
            load: () => loadRaw(() => import("../../../api/results/phase3-black-box/signup-login.generated.spec.ts?raw")),
          },
        ],
      },
    ],
  },
];

export const phaseRegressionEvidence = [
  { feature: "Playwright requirement-driven generation", result: "Signup/login flow and a new example.com control passed; the broken-button injection was caught. Multi-clause TodoMVC remains NOT YET VERIFIED due proxy reachability." },
  { feature: "Self-Healing", result: "Real API call created and listed a new contractVersion 1.0 proposal. The actual failed-locator pipeline trigger is also recorded; browser page rendering remains NOT YET VERIFIED." },
  { feature: "CI/CD integration", result: "A real request generated GitHub Actions YAML after correcting Prisma CUID length validation. Pipeline execution remains unverified and CI authentication still lacks token issuance." },
  { feature: "Governance", result: "Real guardrail write/read requests returned scope ADVISORY; server enforcement remains intentionally disabled." },
  { feature: "Multi-agent orchestration", result: "A real analysis run completed; all eight agent roles emitted started and completed events." },
];
