import os from 'node:os';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    // Every test file shares one dedicated *_test database, so files must not run in parallel.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
    // Uploads made by tests go to a throw-away folder, never into server/uploads.
    env: { UPLOAD_DIR: path.join(os.tmpdir(), 'learning-center-test-uploads') },
  },
});
