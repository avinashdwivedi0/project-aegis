import api from "./api";
import type { RequirementScenario } from "./requirements";

export type TestStep = {
  number: number;
  action: string;
  expectedResult: string;
};

export type TestCase = {
  id: string;
  scenarioId: string;
  title: string;
  priority: "critical" | "high" | "medium" | "low";
  preconditions: string[];
  steps: TestStep[];
  expectedResult: string;
  testData: string[];
};

export type TestDesignOutput = {
  contractVersion: "1.0";
  testCases: TestCase[];
};

export type TestDesignInput = {
  contractVersion: "1.0";
  scenarios: RequirementScenario[];
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export async function designTestCases(
  input: TestDesignInput,
) {
  const response = await api.post<ApiResponse<TestDesignOutput>>(
    "/test-designs",
    input,
  );
  return response.data.data;
}