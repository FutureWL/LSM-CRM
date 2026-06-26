function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback
  if (!v) throw new Error(`Environment variable ${name} is required`)
  return v
}

export const APP_ENV = {
  nodeEnv: (process.env.NODE_ENV ?? 'development') as 'development' | 'production',
  port: Number(process.env.PORT ?? 33501),
  databaseUrl: required('DATABASE_URL', 'postgres://lsm_crm:changeme@localhost:5432/lsm_crm'),
  sessionSecret: required('SESSION_SECRET', 'dev-secret-not-for-production'),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:33500')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
}

export const IS_DEV = APP_ENV.nodeEnv !== 'production'
