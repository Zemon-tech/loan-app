import { defineConfig } from 'vitest/config';

// Pure-TypeScript unit tests only (no React Native runtime).
export default defineConfig({
  define: { __DEV__: false },
  test: {
    include: ['src/**/*.test.ts'],
  },
});