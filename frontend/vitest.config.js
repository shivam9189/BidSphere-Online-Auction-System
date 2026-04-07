import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage',
      all: false,
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: ['node_modules/', 'src/**/__tests__/**'],
      // optional thresholds (adjust to your project's expectations)
      statements: 50,
      branches: 40,
      functions: 50,
      lines: 50,
    },
  },
});
