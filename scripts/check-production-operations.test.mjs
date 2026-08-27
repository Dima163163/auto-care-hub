import test from 'node:test'
import assert from 'node:assert/strict'

import {
    checkDockerDaemon,
    checkOperationalContracts,
    formatProductionOperationsReport,
    getProductionOperationsChecks,
    loadEnvironmentFile,
} from './check-production-operations.mjs'

const completeProductionEnvironment = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgres://autocarehub:secret@db.example.test:5432/autocarehub',
    REDIS_URL: 'redis://cache.example.test:6379',
    JWT_ACCESS_SECRET: 'a'.repeat(40),
    JWT_REFRESH_SECRET: 'b'.repeat(40),
    MAIL_MODE: 'smtp',
    SMTP_HOST: 'smtp.mail.test',
    SMTP_PORT: '587',
    SMTP_USER: 'mailer',
    SMTP_PASSWORD: 'smtp-password',
    MAIL_FROM: 'AutoCare Hub <no-reply@mail.test>',
    CABINET_UPLOADS_DIR: '/var/data/autocarehub/uploads',
    AUTOCARE_ATTACHMENT_STORAGE_PROVIDER: 's3',
    AUTOCARE_ATTACHMENT_S3_BUCKET: 'autocare-private-attachments',
    AUTOCARE_ATTACHMENT_S3_ACCESS_KEY_ID: 'access-key',
    AUTOCARE_ATTACHMENT_S3_SECRET_ACCESS_KEY: 'secret-key',
    BOOTSTRAP_SUPER_ADMIN_EMAIL: 'owner@autocare.test',
    BOOTSTRAP_SUPER_ADMIN_NAME: 'AutoCare owner',
    OUTBOX_TOKEN_ENCRYPTION_KEY: 'c'.repeat(40),
    STAGING_API_BASE_URL: 'https://staging.autocare.test',
}

test('production operations preflight separates local controls from external rehearsals', () => {
    const checks = getProductionOperationsChecks(completeProductionEnvironment, {
        dockerCheck: { name: 'Docker daemon', status: 'pass', detail: 'test daemon' },
    })
    assert.equal(checks.filter((item) => item.status === 'blocked').length, 0)
    assert.ok(checks.some((item) => item.name === 'Worker runtime contract' && item.status === 'pass'))
    assert.ok(checks.some((item) => item.name === 'Backup/restore rehearsal' && item.status === 'manual'))
})

test('missing production dependencies are reported without leaking secret values', () => {
    const checks = getProductionOperationsChecks({ NODE_ENV: 'production', JWT_ACCESS_SECRET: 'change-me' }, {
        dockerCheck: { name: 'Docker daemon', status: 'pass', detail: 'test daemon' },
    })
    const output = formatProductionOperationsReport(checks)
    assert.match(output, /PostgreSQL, Redis, and JWT configuration:.*REDIS_URL/)
    assert.match(output, /SMTP configuration:.*MAIL_MODE=smtp/)
    assert.match(output, /Persistent media storage path:.*CABINET_UPLOADS_DIR/)
    assert.doesNotMatch(output, /change-me/)
})

test('operational contracts and docker check are deterministic', () => {
    assert.equal(checkOperationalContracts().every((item) => item.status === 'pass'), true)
    assert.equal(checkDockerDaemon(() => ({ status: 0, stdout: '29.2.1' })).status, 'pass')
    assert.equal(checkDockerDaemon(() => ({ status: 1, stderr: 'daemon unavailable' })).status, 'blocked')
})

test('dotenv loader parses quoted values and preserves explicit process values', () => {
    const parsed = loadEnvironmentFile('.env.example')
    assert.equal(parsed.NEXT_PUBLIC_API_MODE, 'mock')
    assert.equal(parsed.VITE_DEPLOYMENT_MARKET, 'ru')
})
