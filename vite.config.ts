import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    ignorePatterns: [
      "dist/**",
      "build/**",
      ".expo/**",
      "node_modules/**",
      "coverage/**",
      "**/*.gen.ts",
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {
    ignorePatterns: [
      "dist/**",
      "build/**",
      ".expo/**",
      "node_modules/**",
      "coverage/**",
      "**/*.gen.ts",
      ".agents/**/*.md",
      "**/package.json",
    ],
  },
});
