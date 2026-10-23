import test from 'node:test'
import assert from 'node:assert/strict'

import { formatMvpReadiness, getMvpReadinessChecks } from './check-mvp-readiness.mjs'

const renderSource = `
key: NODE_ENV
        value: production
preDeployCommand: "npm run release:migrate"
startCommand: "npm run start:server"
healthCheckPath: /health/ready
key: MAIL_MODE
        value: smtp
key: BOOTSTRAP_SUPER_ADMIN_EMAIL
        sync: false
key: OUTBOX_TOKEN_ENCRYPTION_KEY
        sync: false
key: DATA_ENCRYPTION_AWS_KMS_REGION
        sync: false
key: DATA_ENCRYPTION_AWS_KMS_KEY_ID
        sync: false
key: DATA_ENCRYPTION_AWS_KMS_KEYRING
        sync: false
key: DATA_ENCRYPTION_AWS_KMS_REGION
        sync: false
key: DATA_ENCRYPTION_AWS_KMS_KEY_ID
        sync: false
key: DATA_ENCRYPTION_AWS_KMS_KEYRING
        sync: false
key: CABINET_UPLOADS_DIR
        sync: false
https://autocarehub.app
`

const completeEnvironment = {
    DATABASE_HOST: 'localhost',
    DATABASE_PORT: '5432',
    DATABASE_USER: 'autocarehub',
    DATABASE_PASSWORD: 'database-password',
    DATABASE_NAME: 'autocarehub_test',
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    JWT_ACCESS_SECRET: 'access-secret',
    JWT_REFRESH_SECRET: 'refresh-secret',
    DATA_ENCRYPTION_AWS_KMS_REGION: 'eu-central-1',
    DATA_ENCRYPTION_AWS_KMS_KEY_ID: 'arn:aws:kms:eu-central-1:111122223333:key/abc',
    DATA_ENCRYPTION_AWS_KMS_KEYRING: 'c3ludGhldGlj',
    MAIL_MODE: 'smtp',
    SMTP_HOST: 'smtp.mailhost.test',
    SMTP_PORT: '587',
    SMTP_USER: 'mailer',
    SMTP_PASSWORD: 'mailer-password',
    MAIL_FROM: 'AutoCare Hub <no-reply@mailhost.test>',
    CABINET_UPLOADS_DIR: '/var/data/autocarehub/uploads/cabinets',
    BOOTSTRAP_SUPER_ADMIN_EMAIL: 'owner@autocarehub.test',
    BOOTSTRAP_SUPER_ADMIN_NAME: 'AutoCare Hub Owner',
}

test('reports configured MVP prerequisites without treating external evidence as passed', () => {
    const checks = getMvpReadinessChecks(completeEnvironment, renderSource)
    assert.equal(checks.filter((item) => item.status === 'blocked').length, 0)
    assert.equal(checks.filter((item) => item.status === 'manual').length, 1)
})

test('rejects placeholders without leaking secret values', () => {
    const checks = getMvpReadinessChecks({
        ...completeEnvironment,
        SMTP_PASSWORD: 'change-me',
        CABINET_UPLOADS_DIR: '',
    }, renderSource)
    const output = formatMvpReadiness(checks)

    assert.match(output, /SMTP configuration:.*SMTP_PASSWORD/)
    assert.match(output, /Cabinet media storage:.*CABINET_UPLOADS_DIR/)
    assert.doesNotMatch(output, /change-me/)
})

test('fails when the production Render contract is incomplete', () => {
    const checks = getMvpReadinessChecks(completeEnvironment, renderSource.replace('startCommand: "npm run start:server"', 'startCommand: "npm run dev"'))
    const renderCheck = checks.find((item) => item.name === 'Render startup contract')

    assert.equal(renderCheck?.status, 'blocked')
})

test('fails readiness when the production KMS keyring is missing', () => {
    const checks = getMvpReadinessChecks({ ...completeEnvironment, DATA_ENCRYPTION_AWS_KMS_KEYRING: '' }, renderSource)
    const kmsCheck = checks.find((item) => item.name === 'Production KMS keyring configuration')
    assert.equal(kmsCheck?.status, 'blocked')
})
