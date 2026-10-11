import api from "./api";
import type { TestCase } from "./test-design";

export type GeneratedPlaywrightFile = {
  path: string;
  language: "typescript";
  testCaseId: string;
  content: string;
};

export type ScriptGenerationOutput = {
  contractVersion: "1.0";
  files: GeneratedPlaywrightFile[];
};

export type ScriptGenerationInput = {
  contractVersion: "1.0";
  approved: true;
  testCases: TestCase[];
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export async function generatePlaywrightScripts(
  input: ScriptGenerationInput,
) {
  const response = await api.post<ApiResponse<ScriptGenerationOutput>>(
    "/script-generators",
    input,
  );
  return response.data.data;
}