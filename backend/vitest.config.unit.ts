import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: '.',
    include: [
      'src/utils/**/*.test.ts',
      'src/middleware/**/*.test.ts',
      'src/services/**/*.test.ts',
      'src/config/**/*.test.ts',
    ],
    exclude: ['src/test/**'],
    testTimeout: 30_000,
    pool: 'forks',
    fileParallelism: false,
    maxWorkers: 1,
  },
});
