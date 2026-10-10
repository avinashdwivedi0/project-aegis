import * as ts from "typescript";

import type { JavaScriptUnitTarget } from "./unit.types.js";

export type ExportedComponentSource = {
  target: JavaScriptUnitTarget;
  source: string;
  behavior: "doughnut-chart" | "vertical-graph" | "landing-hero";
};

const EXPECTED_COMPONENTS = ["DoughnutChart", "VerticalGraph", "Hero"] as const;

export class ExportedComponentGenerator {
  generate(candidates: ExportedComponentSource[]): string {
    const byName = new Map(candidates.map((candidate) => [candidate.target.name, candidate]));
    for (const name of EXPECTED_COMPONENTS) {
      const candidate = byName.get(name);
      if (!candidate) throw new Error(`Exported function ${name} was not discovered.`);
      if (!candidate.target.exported) throw new Error(`Function ${name} is not exported from its real module.`);
      if (candidate.target.unsupportedReasons.length) {
        throw new Error(`Function ${name} needs human review: ${candidate.target.unsupportedReasons.join(" ")}`);
      }
    }

    const transpile = (source: string, filename: string) => ts.transpileModule(source, {
      fileName: filename,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      },
    }).outputText;
    const sourceModules = new Map(EXPECTED_COMPONENTS.map((name) => {
      const candidate = byName.get(name)!;
      return [name, transpile(candidate.source, candidate.target.filePath)] as const;
    }));

    return `// Generated from exported source modules: ${EXPECTED_COMPONENTS.map((name) => {
      const target = byName.get(name)!.target;
      return `${target.filePath}:${target.lineStart}-${target.lineEnd}`;
    }).join(", ")}.
// The real modules are transpiled from current repository source and loaded with their actual dependencies.
const test = require("node:test");
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const targetRequire = createRequire("/workspace/dashboard/package.json");
const React = targetRequire("react");
const { renderToStaticMarkup } = targetRequire("react-dom/server");
const chartComponents = targetRequire("react-chartjs-2");

function loadTargetModule(source) {
  const module = { exports: {} };
  const targetModuleRequire = (specifier) => targetRequire(specifier);
  new Function("require", "module", "exports", source)(targetModuleRequire, module, module.exports);
  return module.exports;
}

const doughnutModule = loadTargetModule(${JSON.stringify(sourceModules.get("DoughnutChart"))});
const verticalModule = loadTargetModule(${JSON.stringify(sourceModules.get("VerticalGraph"))});
const heroModule = loadTargetModule(${JSON.stringify(sourceModules.get("Hero"))});

test("DoughnutChart forwards the caller's data to the real Doughnut chart", () => {
  const data = { labels: ["A", "B"], datasets: [{ data: [3, 5] }] };
  const element = doughnutModule.DoughnutChart({ data });
  assert.equal(React.isValidElement(element), true);
  assert.equal(element.type, chartComponents.Doughnut);
  assert.equal(element.props.data, data);
});

test("VerticalGraph forwards data and the source-defined Holdings chart title", () => {
  const data = { labels: ["A", "B"], datasets: [{ data: [7, 2] }] };
  const element = verticalModule.VerticalGraph({ data });
  assert.equal(React.isValidElement(element), true);
  assert.equal(element.type, chartComponents.Bar);
  assert.equal(element.props.data, data);
  assert.equal(element.props.options.plugins.title.text, "Holdings");
});

test("@critical Hero renders its real image, heading, and signup action", () => {
  const html = renderToStaticMarkup(React.createElement(heroModule.default));
  assert.match(html, /alt="Hero Image"/);
  assert.match(html, /Invest in everything/);
  assert.ok(html.includes(">Signup Now</button>"));
});
`;
  }
}

export const exportedComponentGenerator = new ExportedComponentGenerator();
