import { dirname } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

const backendRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: backendRoot,
  test: {
    environment: "node",
    include: ["src/**/*.test.js"],
  },
});
