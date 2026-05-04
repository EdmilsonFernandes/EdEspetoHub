import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: '.',
    include: [
      'src/utils/**/*.test.ts',
      'src/services/**/*.test.ts',
    ],
    exclude: ['src/test/**'],
    testTimeout: 30_000,
  },
});
