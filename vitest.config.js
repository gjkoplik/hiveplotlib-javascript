import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    coverage: {
      provider: "v8",
      include: ["hive_plots_d3_viz.js"],
      reporter: ["text", "json-summary"],
    },
  },
  resolve: {
    alias: {
      "https://cdn.jsdelivr.net/npm/d3@7/+esm": "d3",
    },
  },
});
