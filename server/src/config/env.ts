import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const serverRoot = path.resolve(__dirname, '../..');

// Load server/.env when present (Node >= 20.12). Real environment variables always win.
const envFile = path.join(serverRoot, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
if (process.env.NODE_ENV === 'test') {
  process.env.JWT_SECRET ??= 'test-only-secret-that-is-at-least-thirty-two-chars';
}

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/learning_center'),
  MONGODB_URI_TEST: z.string().min(1).default('mongodb://127.0.0.1:27017/learning_center_test'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ADMIN_SESSION_HOURS: z.coerce.number().positive().default(12),
  STUDENT_SESSION_DAYS: z.coerce.number().positive().default(7),
  COOKIE_SECURE: z.stringbool().default(false),
  TRUST_PROXY: z.stringbool().default(false),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  WEB_DIST_DIR: z.string().default('../web/dist'),
  STORAGE_DRIVER: z.enum(['local']).default('local'),
  UPLOAD_DIR: z.string().default('./uploads'),
  SEED_ADMIN_EMAIL: z.string().default('admin@learningcenter.local'),
  SEED_ADMIN_PASSWORD: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
  throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
}
const raw = parsed.data;

if (raw.NODE_ENV === 'production') {
  if (/replace-me|dev-only|test-only/i.test(raw.JWT_SECRET)) {
    throw new Error('Refusing to start in production with a placeholder JWT_SECRET.');
  }
}

export const env = {
  ...raw,
  isProd: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  databaseUri: raw.NODE_ENV === 'test' ? raw.MONGODB_URI_TEST : raw.MONGODB_URI,
  corsOrigins: raw.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean),
  uploadDir: path.resolve(serverRoot, raw.UPLOAD_DIR),
  webDistDir: path.resolve(serverRoot, raw.WEB_DIST_DIR),
};

export const SESSION_COOKIE = 'lc_session';
