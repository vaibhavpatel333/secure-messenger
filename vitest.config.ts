import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: [
      'node_modules',
      'dist',
      // Database tests require native modules (better-sqlite3)
      // Run with: npm run test:all (after npm run rebuild:node)
      'src/electron/database.test.ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules', 'dist', '**/*.test.ts', '**/*.test.tsx'],
    },
  },
});

