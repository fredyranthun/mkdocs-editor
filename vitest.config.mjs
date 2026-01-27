import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.js", "test/**/*.test.js"],
    coverage: {
      reporter: ["text", "json", "html"],
      include: ["src/main/**/*.js"],
    },
  },
});
