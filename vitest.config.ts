import { defineConfig } from 'vitest/config';
import * as path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@dry-lint/dry-lint': path.resolve(__dirname, 'packages/dry-lint/src/index.ts'),
      '@dry-lint/typescript': path.resolve(__dirname, 'packages/typescript/src/index.ts'),
      '@dry-lint/zod': path.resolve(__dirname, 'packages/zod/src/index.ts'),
    },
  },
  test: {
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.{ts,tsx}'],
      exclude: [
        'packages/dry-lint/src/types.ts',
        '**/*.test.ts',
        '**/*.d.ts',
        '**/node_modules/**',
      ],
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 80,
        statements: 80,
      },
      reporter: ['text', 'lcov'],
    },
  },
});
