// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";

export default tseslint.config(
  // Base JS recommended rules
  js.configs.recommended,

  // TypeScript recommended rules (type-aware)
  ...tseslint.configs.recommendedTypeChecked,

  // Prettier integration (disables formatting rules that conflict, enables prettier as a rule)
  prettierConfig,

  {
    plugins: {
      prettier: prettierPlugin,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "prettier/prettier": "error",

      // Allow `_`-prefixed vars to be unused
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],

      // Fastify handlers commonly use floating promises via reply chaining
      "@typescript-eslint/no-floating-promises": "error",

      // Fastify plugins/route registrars must be async even without await
      "@typescript-eslint/require-await": "off",

      // Prefer explicit return types on exported functions
      "@typescript-eslint/explicit-module-boundary-types": "off",

      // Allow `any` in tests/generated code but warn elsewhere
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  // Relax unsafe-any rules in test files — app is dynamically typed by Fastify
  {
    files: ["test/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },


  // Ignore build output and migrations
  {
    ignores: ["dist/**", "supabase/migrations/**", "*.js", "*.mjs"],
  },
);
