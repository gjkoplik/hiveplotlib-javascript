import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        document: "readonly",
        window: "readonly",
        console: "readonly",
      },
    },
  },
  {
    ignores: ["*.min.js", "node_modules/", "coverage/"],
  },
];
