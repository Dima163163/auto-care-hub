// Files without the .integration.test.ts convention that intentionally use
// the real API/database fixture. New pure tests are discovered automatically.
export const DATABASE_FIXTURE_TESTS = {
    'src/routes/health.test.ts': 'Fastify readiness queries PostgreSQL/outbox',
    'src/routes/observability.test.ts': 'HTTP auth and security event persistence',
    'src/modules/auth/auth.test.ts': 'HTTP registration/reset/email verification',
    'src/modules/outbox/outbox.service.test.ts': 'Outbox rows and dispatch persistence',
    'src/modules/admin/system-incidents.test.ts': 'Incident lifecycle persistence',
} as const

export const TEST_GLOBS = ['src/**/*.test.ts', 'src/**/*.spec.ts']
export const INTEGRATION_GLOBS = ['src/**/*.integration.test.ts', ...Object.keys(DATABASE_FIXTURE_TESTS)]

export function classifyTestProfile(path: string): 'unit' | 'integration' {
    return path.endsWith('.integration.test.ts') || Object.hasOwn(DATABASE_FIXTURE_TESTS, path) ? 'integration' : 'unit'
}
