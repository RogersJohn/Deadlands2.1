import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'frontend/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/reference/**'],
  },
});
