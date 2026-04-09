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
        HTMLElement: "readonly",
        CustomEvent: "readonly",
        customElements: "readonly",
        fetch: "readonly",
        queueMicrotask: "readonly",
        setTimeout: "readonly",
      },
    },
  },
  {
    ignores: ["*.min.js", "node_modules/", "coverage/"],
  },
];
