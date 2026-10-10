import type { InferredFormField, SignupLoginFlow } from "./black-box.types.js";

function selectorFor(field: InferredFormField): string {
  if (field.id) return `page.locator(${JSON.stringify(`#${field.id}`)})`;
  if (field.label) return `page.getByLabel(${JSON.stringify(field.label)}, { exact: true })`;
  if (field.placeholder) return `page.getByPlaceholder(${JSON.stringify(field.placeholder)}, { exact: true })`;
  if (field.name) return `page.locator(${JSON.stringify(`[name="${field.name}"]`)})`;
  if (field.id) return `page.locator(${JSON.stringify(`#${field.id}`)})`;
  throw new Error("Cannot make a UI selector for an inferred input without name, label, placeholder, or id.");
}

export class SignupLoginPlaywrightGenerator {
  generate(flow: SignupLoginFlow, urls: { frontend: string; dashboard: string }): string {
    const signupValues: Record<string, string> = {
      fullName: "Black Box Flow QA",
      name: "Black Box Flow QA",
      su_name: "Black Box Flow QA",
      email: "${email}",
      su_email: "${email}",
      mobile: "9876543210",
      password: "BlackBoxFlowPass!2026",
      su_pass: "BlackBoxFlowPass!2026",
    };
    const signupFills = flow.signup.fields
      .filter((field) => field.required || (field.name !== undefined && field.name in signupValues))
      .map((field) => {
        const value = signupValues[field.name ?? field.id ?? ""];
        if (value === undefined) {
          if (field.required) throw new Error(`No real input value supplied for required signup field ${field.name ?? field.placeholder}.`);
          return undefined;
        }
        const expression = value === "${email}" ? "email" : JSON.stringify(value);
        return `  await ${selectorFor(field)}.fill(${expression});`;
      }).filter((line): line is string => Boolean(line)).join("\n");
    const loginFills = flow.login.fields
      .filter((field) => field.required || ["email", "password", "li_email", "li_pass"].includes(field.name ?? field.id ?? ""))
      .map((field) => {
        const value = field.name === "email" || field.id === "email" || field.id === "li_email" ? "email" :
          field.name === "password" || field.id === "password" || field.id === "li_pass" ? "password" : undefined;
        if (!value) throw new Error(`No inferred login value for required field ${field.name ?? field.id ?? field.label}.`);
        return `  await ${selectorFor(field)}.fill(${value});`;
      }).join("\n");
    const dashboardExpectation = "await expect.poll(() => new URL(page.url()).origin).toBe(new URL(dashboardUrl).origin);";

    return `import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const frontendUrl = ${JSON.stringify(urls.frontend)};
const dashboardUrl = ${JSON.stringify(urls.dashboard)};
const password = "BlackBoxFlowPass!2026";

test(${JSON.stringify(`@critical ${flow.name}`)}, async ({ page }) => {
  const email = \`blackbox-\${randomUUID()}@example.test\`;
  const signupResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith(${JSON.stringify(flow.signup.apiPath)}) && response.request().method() === 'POST');
  await page.goto(new URL(${JSON.stringify(flow.signup.route)}, frontendUrl).toString());
${signupFills}
  await page.getByRole('button', { name: ${JSON.stringify(flow.signup.submitLabel)}, exact: true }).click();
  const signupResponse = await signupResponsePromise;
  expect([200, 201]).toContain(signupResponse.status());
  ${dashboardExpectation}

  await page.evaluate(() => localStorage.clear());
  await page.goto(new URL(${JSON.stringify(flow.login.route)}, frontendUrl).toString());
  const loginResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith(${JSON.stringify(flow.login.apiPath)}) && response.request().method() === 'POST');
${loginFills}
  await page.getByRole('button', { name: ${JSON.stringify(flow.login.submitLabel)}, exact: true }).click();
  const loginResponse = await loginResponsePromise;
  expect(loginResponse.status()).toBe(200);
  ${dashboardExpectation}
});
`;
  }
}

export const signupLoginPlaywrightGenerator = new SignupLoginPlaywrightGenerator();
