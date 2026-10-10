import { readFile } from "node:fs/promises";
import path from "node:path";
import * as ts from "typescript";

import type { JavaScriptUnitTarget } from "./unit.types.js";

function lineAt(sourceFile: ts.SourceFile, position: number): number {
  return sourceFile.getLineAndCharacterOfPosition(position).line + 1;
}

function branchCount(node: ts.Node): number {
  let count = 0;
  const visit = (current: ts.Node) => {
    if (current !== node && (ts.isFunctionLike(current) || ts.isClassLike(current))) return;
    if (
      ts.isIfStatement(current) ||
      ts.isConditionalExpression(current) ||
      ts.isSwitchStatement(current) ||
      ts.isCaseClause(current) ||
      ts.isDefaultClause(current)
    ) count += 1;
    ts.forEachChild(current, visit);
  };
  visit(node);
  return count;
}

function parametersOf(node: ts.SignatureDeclaration): string[] {
  return node.parameters.map((parameter) => parameter.name.getText());
}

function isExportedName(sourceFile: ts.SourceFile, name: string, node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  if (modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) return true;
  let declaration: ts.Node | undefined = node;
  while (declaration && !ts.isVariableDeclaration(declaration) && !ts.isFunctionDeclaration(declaration)) {
    declaration = declaration.parent;
  }
  if (declaration && ts.isVariableDeclaration(declaration)) {
    const statement = declaration.parent.parent;
    const statementModifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
    if (statementModifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) return true;
  }
  let exported = false;
  const visit = (current: ts.Node) => {
    if (
      ts.isExportAssignment(current) &&
      ts.isIdentifier(current.expression) &&
      current.expression.text === name
    ) exported = true;
    if (ts.isBinaryExpression(current) && current.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const left = current.left.getText(sourceFile);
      if (
        current.right.kind === ts.SyntaxKind.Identifier &&
        current.right.getText(sourceFile) === name &&
        (left === `exports.${name}` || left === `module.exports.${name}`)
      ) exported = true;
      if (left === "module.exports" && ts.isObjectLiteralExpression(current.right)) {
        exported ||= current.right.properties.some((property) =>
          (ts.isShorthandPropertyAssignment(property) && property.name.text === name) ||
          (ts.isPropertyAssignment(property) && property.initializer.kind === ts.SyntaxKind.Identifier && property.initializer.getText(sourceFile) === name),
        );
      }
    }
    ts.forEachChild(current, visit);
  };
  visit(sourceFile);
  return exported;
}

function candidate(
  sourceFile: ts.SourceFile,
  filePath: string,
  name: string,
  kind: JavaScriptUnitTarget["kind"],
  node: ts.SignatureDeclaration,
  implementation: string,
): JavaScriptUnitTarget {
  const body = "body" in node && node.body ? node.body.getText(sourceFile) : "";
  const externalRisk = /\b(fetch|axios\.|mongoose\.|process\.env|Date\.now|Math\.random|app\.(get|post|put|patch|delete))\b/.test(body);
  const dependencies = new Set<string>();
  if (/\bcrypto\./.test(body)) dependencies.add("crypto");
  if (/\bscrypt\b/.test(body)) dependencies.add("scrypt");
  const unsupportedReasons = externalRisk
    ? ["Function body appears to depend on external state or side effects."]
    : [];
  const confidence = externalRisk ? "low" : dependencies.size > 0 ? "medium" : "high";
  return {
    name,
    filePath,
    kind,
    lineStart: lineAt(sourceFile, node.getStart(sourceFile)),
    lineEnd: lineAt(sourceFile, node.getEnd()),
    parameters: parametersOf(node),
    isAsync: Boolean((node as ts.FunctionLikeDeclaration).modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword)),
    exported: isExportedName(sourceFile, name, node),
    branchCount: branchCount(node),
    implementation,
    confidence,
    unsupportedReasons,
  };
}

export class JavaScriptUnitDiscoveryService {
  async discoverFile(workspace: string, relativeFilePath: string): Promise<JavaScriptUnitTarget[]> {
    const absoluteWorkspace = path.resolve(workspace);
    const absoluteFile = path.resolve(absoluteWorkspace, relativeFilePath);
    const relative = path.relative(absoluteWorkspace, absoluteFile);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error("Unit discovery file must be inside the repository workspace.");
    }
    const source = await readFile(absoluteFile, "utf8");
    const scriptKind = /\.jsx?$/i.test(relativeFilePath) ? ts.ScriptKind.JSX : ts.ScriptKind.JS;
    const sourceFile = ts.createSourceFile(absoluteFile, source, ts.ScriptTarget.Latest, true, scriptKind);
    const targets: JavaScriptUnitTarget[] = [];

    for (const statement of sourceFile.statements) {
      if (ts.isFunctionDeclaration(statement) && statement.name) {
        targets.push(candidate(sourceFile, relativeFilePath, statement.name.text, "function", statement, statement.getText(sourceFile)));
        continue;
      }
      if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
          const initializer = declaration.initializer;
          if (!ts.isArrowFunction(initializer) && !ts.isFunctionExpression(initializer)) continue;
          const implementation = `${statement.declarationList.flags & ts.NodeFlags.Const ? "const" : "let"} ${declaration.getText(sourceFile)};`;
          targets.push(candidate(sourceFile, relativeFilePath, declaration.name.text, "arrow", initializer, implementation));
        }
        continue;
      }
      if (ts.isClassDeclaration(statement) && statement.name) {
        for (const member of statement.members) {
          if (!ts.isMethodDeclaration(member) || !member.body) continue;
          const name = member.name.getText(sourceFile).replace(/^['"]|['"]$/g, "");
          targets.push(candidate(sourceFile, relativeFilePath, `${statement.name.text}.${name}`, "method", member, member.getText(sourceFile)));
        }
      }
    }
    return targets;
  }
}

export const javascriptUnitDiscoveryService = new JavaScriptUnitDiscoveryService();
