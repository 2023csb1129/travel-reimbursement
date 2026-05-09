import tsParser from "@typescript-eslint/parser";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  {
    files: ["**/*.{js,mjs,ts,tsx}"],
    ignores: [".next/**", "node_modules/**"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2024,
      sourceType: "module",
    },
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.flatConfig.coreWebVitals.rules,
    },
  },
];
