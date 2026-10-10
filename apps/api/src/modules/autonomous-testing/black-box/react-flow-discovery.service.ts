import { readFile } from "node:fs/promises";
import path from "node:path";
import * as ts from "typescript";

import type { InferredFormField, InferredPageForm, SignupLoginFlow } from "./black-box.types.js";

type RouteComponent = { route: string; component: string; sourceFile: string };
type PageDetails = { form: InferredPageForm; source: string };

function stringAttribute(opening: ts.JsxOpeningLikeElement, name: string): string | undefined {
  const attribute = opening.attributes.properties.find((item) =>
    ts.isJsxAttribute(item) && item.name.getText() === name,
  );
  if (!attribute || !ts.isJsxAttribute(attribute) || !attribute.initializer) return undefined;
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  if (ts.isJsxExpression(attribute.initializer)) return attribute.initializer.expression?.getText();
  return undefined;
}

function hasAttribute(opening: ts.JsxOpeningLikeElement, name: string): boolean {
  return opening.attributes.properties.some((item) => ts.isJsxAttribute(item) && item.name.getText() === name);
}

function textChildren(element: ts.JsxElement): string {
  return element.children.map((child) => {
    if (ts.isJsxText(child)) return child.text.trim();
    if (ts.isJsxExpression(child) && child.expression) {
      const strings: string[] = [];
      const collect = (node: ts.Node) => {
        if (ts.isStringLiteral(node)) strings.push(node.text);
        ts.forEachChild(node, collect);
      };
      collect(child.expression);
      return strings.at(-1) ?? "";
    }
    return "";
  }).filter(Boolean).join(" ");
}

function getRouteComponents(sourceFile: ts.SourceFile): RouteComponent[] {
  const importPaths = new Map<string, string>();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause?.name || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    importPaths.set(statement.importClause.name.text, statement.moduleSpecifier.text);
  }
  const routes: RouteComponent[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText() === "Route") {
      const route = stringAttribute(node, "path");
      const elementAttribute = node.attributes.properties.find((item) => ts.isJsxAttribute(item) && item.name.getText() === "element");
      if (route && elementAttribute && ts.isJsxAttribute(elementAttribute) && elementAttribute.initializer && ts.isJsxExpression(elementAttribute.initializer)) {
        const page = elementAttribute.initializer.expression;
        if (page && ts.isJsxSelfClosingElement(page)) {
          const component = page.tagName.getText();
          const sourcePath = importPaths.get(component);
          if (sourcePath) routes.push({ route, component, sourceFile: sourcePath });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return routes;
}

function parseFields(sourceFile: ts.SourceFile, labels: Map<string, string>): InferredFormField[] {
  const fields: InferredFormField[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText() === "input") {
      const name = stringAttribute(node, "name");
      const id = stringAttribute(node, "id");
      const type = stringAttribute(node, "type") ?? "text";
      if (type === "submit" || type === "hidden") return;
      const minLength = stringAttribute(node, "minLength");
      fields.push({
        name,
        id,
        label: id ? labels.get(id) : undefined,
        placeholder: stringAttribute(node, "placeholder"),
        type,
        required: hasAttribute(node, "required"),
        minLength: minLength ? Number(minLength) : undefined,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return fields;
}

function readPageForm(source: string, sourcePath: string, route: string, component: string): PageDetails {
  const sourceFile = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
  const labels = new Map<string, string>();
  let submitHandler = "";
  let submitLabel = "";
  let apiPath = "";
  let redirectsToDashboard = false;
  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node)) {
      const opening = node.openingElement;
      if (opening.tagName.getText() === "label") {
        const htmlFor = stringAttribute(opening, "htmlFor");
        if (htmlFor) labels.set(htmlFor, textChildren(node));
      }
      if (opening.tagName.getText() === "form") {
        submitHandler = stringAttribute(opening, "onSubmit")?.replace(/[{}\s]/g, "") ?? submitHandler;
      }
      if (opening.tagName.getText() === "button" && stringAttribute(opening, "type") === "submit") {
        submitLabel = textChildren(node);
      }
    }
    if (ts.isCallExpression(node) && node.expression.getText(sourceFile) === "fetch") {
      const argument = node.arguments[0]?.getText(sourceFile) ?? "";
      const match = argument.match(/\/(signup|login)/);
      if (match) apiPath = `/${match[1]}`;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  const fields = parseFields(sourceFile, labels);
  redirectsToDashboard = source.includes("window.location.assign(DASHBOARD_URL)");
  if (!submitHandler || !submitLabel || !apiPath || !redirectsToDashboard || fields.length === 0) {
    throw new Error(`Could not infer the real form flow from ${sourcePath} (${route}).`);
  }
  return { form: { route, component, filePath: sourcePath, submitHandler, submitLabel, fields, apiPath, redirectsToDashboard }, source };
}

export class ReactFlowDiscoveryService {
  async discoverSignupLogin(workspace: string): Promise<SignupLoginFlow> {
    const root = path.resolve(workspace);
    const routesPath = path.join(root, "frontend", "src", "index.js");
    let routesSource: string;
    try {
      routesSource = await readFile(routesPath, "utf8");
    } catch {
      return this.discoverVanillaSignupLogin(root);
    }
    const routesSourceFile = ts.createSourceFile(routesPath, routesSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
    const routes = getRouteComponents(routesSourceFile);
    const signupRoute = routes.find((route) => route.route === "/signup");
    const loginRoute = routes.find((route) => route.route === "/login");
    if (!signupRoute || !loginRoute) throw new Error("Actual frontend routes /signup and /login were not both found.");

    const resolvePage = async (route: RouteComponent): Promise<PageDetails> => {
      const relative = path.join("frontend", "src", `${route.sourceFile}.js`);
      const fullPath = path.join(root, relative);
      const source = await readFile(fullPath, "utf8");
      return readPageForm(source, relative, route.route, route.component);
    };
    const signup = await resolvePage(signupRoute);
    const login = await resolvePage(loginRoute);
    const signupLink = signup.source.includes('to="/login"');
    const loginLink = login.source.includes('to="/signup"');
    if (!signupLink || !loginLink || signup.form.apiPath !== "/signup" || login.form.apiPath !== "/login") {
      throw new Error("Signup/login links or API paths do not support the inferred round-trip flow.");
    }

    return {
      name: "Signup account, then log in with the created account",
      frontendRoutes: routes.map((route) => route.route),
      signup: signup.form,
      login: login.form,
      sourceEvidence: [
        "frontend/src/index.js defines /signup -> Signup and /login -> Login",
        `${signup.form.filePath}: form onSubmit={${signup.form.submitHandler}}, POST ${signup.form.apiPath}, redirect to DASHBOARD_URL`,
        `${login.form.filePath}: form onSubmit={${login.form.submitHandler}}, POST ${login.form.apiPath}, redirect to DASHBOARD_URL`,
        "Signup and login pages link to each other using their actual React Router paths",
      ],
    };
  }

  private async discoverVanillaSignupLogin(root: string): Promise<SignupLoginFlow> {
    const htmlPath = path.join(root, "frontend", "index.html");
    const authPath = path.join(root, "frontend", "js", "auth.js");
    const [html, source] = await Promise.all([
      readFile(htmlPath, "utf8"),
      readFile(authPath, "utf8"),
    ]);
    if (!source.includes("function showAuth()")) {
      throw new Error("No supported React route file or vanilla frontend/js/auth.js flow was found.");
    }

    const markup = source.match(/view\.innerHTML\s*=\s*`([\s\S]*?)`;/)?.[1];
    if (!markup || !html.includes("./js/app.js")) {
      throw new Error("The vanilla frontend entry point or authentication markup could not be inferred.");
    }

    const inputElements = [...markup.matchAll(/<input\b[^>]*>/gi)].map(([element]) => element);
    const parseAttributes = (element: string) => Object.fromEntries(
      [...element.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
        .map((match) => [match[1].toLowerCase(), match[2] ?? match[3] ?? ""]),
    );
    const fields = inputElements.map((element) => {
      const attributes = parseAttributes(element);
      return {
        name: attributes.name,
        id: attributes.id,
        placeholder: attributes.placeholder,
        type: attributes.type ?? "text",
        required: /\srequired(?:\s|>|=)/i.test(element),
        ...(attributes.minlength ? { minLength: Number(attributes.minlength) } : {}),
      };
    });
    const getButton = (id: string) => {
      const match = markup.match(new RegExp(`<button\\b[^>]*\\bid=["']${id}["'][^>]*>([\\s\\S]*?)<\\/button>`, "i"));
      const label = match?.[1].replace(/<[^>]+>/g, "").trim();
      const handler = source.match(new RegExp(`getElementById\\(["']${id}["']\\)\\.onclick\\s*=\\s*([\\w$]+)`))?.[1];
      if (!label || !handler) throw new Error(`Could not infer the ${id} submit button and handler.`);
      return { label, handler };
    };
    const signupButton = getButton("btn_register");
    const loginButton = getButton("btn_login");
    const apiPath = (suffix: string) => {
      if (!source.includes(`/auth/${suffix}`)) throw new Error(`Could not infer POST /auth/${suffix} from the frontend source.`);
      return `/auth/${suffix}`;
    };
    const signupFields = fields.filter(({ id }) => id?.startsWith("su_"));
    const loginFields = fields.filter(({ id }) => id?.startsWith("li_"));
    if (signupFields.length === 0 || loginFields.length === 0 || !source.includes("showRoadmap()")) {
      throw new Error("Signup/login fields or the post-authentication dashboard transition could not be inferred.");
    }

    const toForm = (
      formFields: typeof fields,
      route: string,
      submitHandler: string,
      submitLabel: string,
      endpoint: string,
    ): InferredPageForm => ({
      route,
      component: "showAuth",
      filePath: "frontend/js/auth.js",
      submitHandler,
      submitLabel,
      fields: formFields,
      apiPath: endpoint,
      redirectsToDashboard: true,
    });

    return {
      name: "Create an account and log in through the vanilla JavaScript frontend",
      frontendRoutes: ["/"],
      signup: toForm(signupFields, "/", signupButton.handler, signupButton.label, apiPath("register")),
      login: toForm(loginFields, "/", loginButton.handler, loginButton.label, apiPath("login")),
      sourceEvidence: [
        "frontend/index.html loads the vanilla JavaScript frontend entry point",
        "frontend/js/auth.js renders separate registration and login controls",
        "The registration control POSTs /auth/register and then enters the dashboard view",
        "The login control POSTs /auth/login",
      ],
    };
  }
}

export const reactFlowDiscoveryService = new ReactFlowDiscoveryService();
