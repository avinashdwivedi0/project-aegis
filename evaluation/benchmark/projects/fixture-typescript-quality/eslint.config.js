import parser from "@typescript-eslint/parser";

export default [
  {
    files: ["src/**/*.ts"],
    languageOptions: { parser },
    rules: {
      "no-eval": "error",
    },
  },
];
