import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import * as ts from "typescript";

import type { DiscoveredHttpRoute, IntegrationDiscoveryResult } from "./integration.types.js";

const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete"]);
const CONTRACT_NAME = /^(openapi|swagger)(\.|$)|\.(graphql|gql)$/i;

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if ([".git", "node_modules", "dist", "build"].includes(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(fullPath));
    else files.push(fullPath);
  }
  return files;
}

function routeFromCall(sourceFile: ts.SourceFile, call: ts.CallExpression, filePath: string): DiscoveredHttpRoute | undefined {
  if (!ts.isPropertyAccessExpression(call.expression)) return undefined;
  const method = call.expression.name.text.toLowerCase();
  if (!HTTP_METHODS.has(method)) return undefined;
  const route = call.arguments[0];
  const handler = call.arguments.at(-1);
  if (!route || !ts.isStringLiteralLike(route) || !handler) return undefined;
  return {
    method: method.toUpperCase() as DiscoveredHttpRoute["method"],
    path: route.text,
    filePath,
    line: sourceFile.getLineAndCharacterOfPosition(call.getStart(sourceFile)).line + 1,
    handlerSource: handler.getText(sourceFile),
  };
}

export class JavaScriptRouteDiscoveryService {
  async discover(workspace: string): Promise<IntegrationDiscoveryResult> {
    const root = path.resolve(workspace);
    const allFiles = await listFiles(root);
    const contractPaths = allFiles.filter((file) => CONTRACT_NAME.test(path.basename(file)));
    const routes: DiscoveredHttpRoute[] = [];

    for (const absolutePath of allFiles.filter((file) => /\.[cm]?jsx?$/i.test(file))) {
      const source = await readFile(absolutePath, "utf8");
      const sourceFile = ts.createSourceFile(absolutePath, source, ts.ScriptTarget.Latest, true,
        /\.jsx$/i.test(absolutePath) ? ts.ScriptKind.JSX : ts.ScriptKind.JS);
      const visit = (node: ts.Node) => {
        if (ts.isCallExpression(node)) {
          const route = routeFromCall(sourceFile, node, path.relative(root, absolutePath));
          if (route) routes.push(route);
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);
    }

    const contractKind = contractPaths.some((file) => /\.graphql$|\.gql$/i.test(file))
      ? "graphql"
      : contractPaths.some((file) => /swagger/i.test(path.basename(file)))
        ? "swagger"
        : contractPaths.length > 0 ? "openapi" : "none";
    return {
      contractFiles: contractPaths.map((file) => path.relative(root, file)),
      contractKind,
      routes: routes.sort((left, right) => left.filePath.localeCompare(right.filePath) || left.line - right.line),
    };
  }
}

export const javascriptRouteDiscoveryService = new JavaScriptRouteDiscoveryService();
