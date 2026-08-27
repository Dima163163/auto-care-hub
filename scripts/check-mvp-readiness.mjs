import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
    formatIntegrationPrerequisiteFailure,
    getMissingIntegrationPrerequisites,
} from './check-integration-prerequisites.mjs'
import { assertRenderProductionConfig } from './check-render-production-config.mjs'

const SECRET_PLACEHOLDER_PATTERN = /(?:replace|change[-_ ]?me|mock|example\.com|admin@example\.com)/i

function hasConfiguredValue(value) {
    const normalized = String(value ?? '').trim()
    return Boolean(normalized) && !SECRET_PLACEHOLDER_PATTERN.test(normalized)
}

function check(name, status, detail) {
    return { name, status, detail }
}

export function getMvpReadinessChecks(environment = process.env, renderSource = '') {
    const checks = []

    try {
        assertRenderProductionConfig(renderSource)
        checks.push(check('Render startup contract', 'pass', 'production mode, migration job, migration-free start, SMTP, and required secrets are declared'))
    } catch (error) {
        checks.push(check('Render startup contract', 'blocked', error instanceof Error ? error.message : 'invalid Render configuration'))
    }

    const integrationMissing = getMissingIntegrationPrerequisites(environment)
    checks.push(integrationMissing.length === 0
        ? check('PostgreSQL, Redis, and JWT configuration', 'pass', 'provider URLs or host configuration are present')
        : check('PostgreSQL, Redis, and JWT configuration', 'blocked', formatIntegrationPrerequisiteFailure(integrationMissing).split('\n')[0]))

    const smtpNames = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM']
    const missingSmtp = environment.MAIL_MODE !== 'smtp'
        ? ['MAIL_MODE=smtp']
        : smtpNames.filter((name) => !hasConfiguredValue(environment[name]))
    checks.push(missingSmtp.length === 0
        ? check('SMTP configuration', 'pass', 'SMTP mode and required non-placeholder settings are present')
        : check('SMTP configuration', 'blocked', `missing or placeholder values: ${missingSmtp.join(', ')}`))

    const provider = String(environment.CABINET_IMAGE_STORAGE_PROVIDER ?? 'filesystem').trim()
    if (provider === 's3') {
        checks.push(check('Cabinet media storage', 'blocked', 'the S3 adapter is not installed; use a mounted filesystem volume or add the approved adapter'))
    } else if (provider === 'filesystem' && hasConfiguredValue(environment.CABINET_UPLOADS_DIR)) {
        checks.push(check('Cabinet media storage', 'pass', 'filesystem root is explicit; volume durability and CDN delivery still require operator evidence'))
    } else {
        checks.push(check('Cabinet media storage', 'blocked', 'set CABINET_UPLOADS_DIR to the approved persistent volume path'))
    }

    const bootstrapMissing = ['BOOTSTRAP_SUPER_ADMIN_EMAIL', 'BOOTSTRAP_SUPER_ADMIN_NAME']
        .filter((name) => !hasConfiguredValue(environment[name]))
    checks.push(bootstrapMissing.length === 0
        ? check('Bootstrap super-admin', 'pass', 'bootstrap identity is explicitly configured')
        : check('Bootstrap super-admin', 'blocked', `missing or placeholder values: ${bootstrapMissing.join(', ')}`))

    checks.push(check(
        'External launch evidence',
        'manual',
        'run npm run check:production-operations, then verify mailbox delivery, backup restore, monitoring alerts, WAF policy, browser CI, and privacy approval',
    ))

    return checks
}

export function formatMvpReadiness(checks) {
    const lines = ['MVP readiness preflight']
    for (const item of checks) {
        lines.push(`[${item.status.toUpperCase()}] ${item.name}: ${item.detail}`)
    }

    const blocked = checks.filter((item) => item.status === 'blocked').length
    const manual = checks.filter((item) => item.status === 'manual').length
    lines.push(`Result: ${blocked > 0 ? `blocked by ${blocked} configuration issue(s)` : 'configuration is complete'}; ${manual} external evidence gate(s) remain manual.`)
    return lines.join('\n')
}

async function main() {
    const renderSource = await readFile(resolve(process.cwd(), 'render.yaml'), 'utf8')
    const checks = getMvpReadinessChecks(process.env, renderSource)
    console.log(formatMvpReadiness(checks))
    if (checks.some((item) => item.status === 'blocked')) {
        process.exitCode = 1
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    await main()
}
