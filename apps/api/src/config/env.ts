import dotenv from 'dotenv';
import path from 'path';

// Load .env from apps/api or workspace root
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  DATABASE_URL: process.env.DATABASE_URL || '',
  DIRECT_URL: process.env.DIRECT_URL || process.env.DATABASE_URL || '',
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://mock.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-service-role-key',
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET || 'mock-jwt-secret',
  // CORS_ORIGIN (singular) kept for backward compatibility.
  // CORS_ORIGINS (plural) accepts a comma-separated list of allowed origins.
  // If neither is set, localhost:5173 is allowed in all environments.
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  // Parse comma-separated CORS_ORIGINS into an array; falls back to the
  // single CORS_ORIGIN value so existing deployments need no changes.
  get CORS_ORIGINS(): string[] {
    const raw = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:5173';
    return raw.split(',').map((o) => o.trim()).filter(Boolean);
  },
};
