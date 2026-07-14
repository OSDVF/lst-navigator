// eslint.config.js
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    rules: {
      semi: ["error", "never"],
      indent: ["error", 4],
      curly: ["error", "all"],
      "@typescript-eslint/no-explicit-any": ["off"],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "comma-dangle": ["error", "always-multiline"],
      "space-before-function-paren": ["off"],
      "no-multiple-empty-lines": ["off"],
      quotes: ["error", "single"],
      "quote-props": ["warn", "as-needed"],
    },
  },
]);
