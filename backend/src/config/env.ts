import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Local-only fallback secret. It is public (it appears in the repository docs),
// so it is accepted ONLY when NODE_ENV is explicitly "development" or "test".
const DEV_ONLY_JWT_SECRET = 'elune_super_secure_jwt_secret_key_2026_sanctuary';

// Secrets that have been published in README / docs and must never be used
// outside local development.
const PUBLICLY_KNOWN_JWT_SECRETS = [
  DEV_ONLY_JWT_SECRET,
  'elune_super_secure_jwt_secret_key_2026',
  'replace_me',
  'changeme',
  'secret'
];

const isLocalEnv = (nodeEnv?: string) => nodeEnv === 'development' || nodeEnv === 'test';

/**
 * Validate security-relevant configuration. Returns a list of problems; an
 * empty list means the configuration is acceptable for the given NODE_ENV.
 * Exported so it can be unit-tested without mutating process.env.
 */
export function validateEnv(env: NodeJS.ProcessEnv): string[] {
  const errors: string[] = [];
  if (isLocalEnv(env.NODE_ENV)) return errors;

  const secret = env.JWT_SECRET;
  if (!secret) {
    errors.push(
      'JWT_SECRET must be set when NODE_ENV is not "development" or "test" (current: ' +
        (env.NODE_ENV || 'unset') +
        ').'
    );
  } else if (PUBLICLY_KNOWN_JWT_SECRETS.includes(secret)) {
    errors.push('JWT_SECRET uses a publicly documented value; generate a new random secret for this environment.');
  } else if (secret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters outside development/test.');
  }
  return errors;
}

const envErrors = validateEnv(process.env);
if (envErrors.length > 0) {
  // Fail fast: never start with a forgeable token secret.
  throw new Error(`[ENV] Insecure configuration:\n - ${envErrors.join('\n - ')}`);
}

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  // Prisma reads DATABASE_URL directly from the environment; no credential fallback is kept in source.
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || DEV_ONLY_JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://elune-gis.vercel.app',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads'),
  MAX_FILE_SIZE_MB: process.env.MAX_FILE_SIZE_MB ? parseInt(process.env.MAX_FILE_SIZE_MB, 10) : 50
};
