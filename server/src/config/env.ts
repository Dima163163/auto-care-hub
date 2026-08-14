import 'dotenv/config'
import type { SignOptions } from 'jsonwebtoken'

import { validateTrustedProxyConfig } from '../shared/security/trusted-proxy.js'
import { validateOAuthRedirectUri } from '../shared/security/oauth-redirect.js'
import { resolveCabinetImageStorageProvider } from '../modules/cabinets/storage-provider-policy.js'
import { resolveExternalPaymentProviderConfig } from '../modules/payments/external-provider-config.js'
import { parseHealthThreshold } from '../routes/health-thresholds.js'
import { normalizeAuditLogRetentionDays } from '../modules/admin/audit-retention-policy.js'
import {
    DEFAULT_SECURITY_EVENT_IP_RETENTION_DAYS,
    normalizeSecurityEventIpRetentionDays,
} from '../modules/admin/security-event-retention-policy.js'
import { normalizeFrontendOrigin } from '../shared/security/frontend-origin-policy.js'
import {
    getBreachedPasswordClientPolicy,
    resolveBreachedPasswordCheckMode,
} from '../modules/auth/breached-password-policy.js'
import { assertMailModeAllowed } from './mail-config-policy.js'
import { normalizeRuntimeMode, type RuntimeMode } from './runtime-mode-policy.js'
import { resolveCabinetUploadsDir } from './cabinet-uploads-path.js'
import { getStripeConfig } from './stripe-config-policy.js'
import {
    DEFAULT_BOOKING_REMINDER_HOURS,
    MAX_BOOKING_REMINDER_HOURS,
} from '../modules/jobs/booking-reminder-policy.js'
import {
    getDeploymentCapabilities,
    resolveDeploymentMarket,
    type DeploymentCapabilities,
} from './deployment-capabilities.js'

const NODE_ENVS = ['development', 'test', 'production'] as const

type NodeEnv = (typeof NODE_ENVS)[number]

type LoggerMailConfig = {
    mode: 'logger'
}

type SmtpMailConfig = {
    mode: 'smtp'
    host: string
    port: number
    secure: boolean
    user: string
    password: string
    from: string
}

export type EnvConfig = {
    nodeEnv: NodeEnv
    runtimeMode: RuntimeMode
    port: number
    host: string
    trustedProxy: {
        hops: number
        cidrs: string[]
    }
    cabinetPhotoAllowedHosts: string[]
    cabinetImageStorageProvider: 'filesystem' | 's3'
    cabinetUploadsDir: string
    corsOrigins: string[]
    frontendOrigin: string
    deployment: DeploymentCapabilities
    database: {
        url: string | null
        host: string
        port: number
        username: string
        password: string
        name: string
        poolSize: number
        poolMin: number
        idleTimeoutMs: number
        connectionTimeoutMs: number
        queryTimeoutMs: number
        statementTimeoutMs: number
        slowQueryThresholdMs: number
        maxActiveRatio: number
        maxWaitingRequests: number
    }
    redis: {
        enabled: boolean
        url: string | null
        host: string
        port: number
        password: string | null
    }
    auth: {
        jwtAccessSecret: string
        jwtAccessExpiresIn: SignOptions['expiresIn']
        jwtRefreshSecret: string
        jwtRefreshExpiresIn: SignOptions['expiresIn']
        refreshTokenCookieName: string
        csrfTokenCookieName: string
        breachedPasswordCheckMode: 'off' | 'shadow' | 'enforce'
        breachedPasswordCheckTimeoutMs: number
    }
    bootstrap: {
        superAdminEmail: string | null
        superAdminName: string
    }
    outboxTokenEncryptionKey: string
    mail: LoggerMailConfig | SmtpMailConfig
    oauth: {
        stateCookieName: string
        requestTimeoutMs: number
        maxRetries: number
        google: {
            clientId: string
            clientSecret: string
            redirectUri: string
        }
        yandex: {
            clientId: string
            clientSecret: string
            redirectUri: string
        }
    }
    stripe: {
        secretKey: string
        webhookSecret: string
        requestTimeoutMs: number
        maxNetworkRetries: number
    }
    auditLogRetentionDays: number
    securityEventIpRetentionDays: number
    notificationRetentionDays: number
    bookingReminderHours: number
    cabinetUploadOrphanGraceHours: number
    backgroundJobShutdownTimeoutMs: number
    backgroundJobCycleTimeoutMs: number
    backgroundJobPhaseTimeoutMs: number
    healthProbeTimeoutMs: number
    authCleanupBatchSize: number
    outboxMaxPending: number
    outboxMaxDeadLetter: number
    outboxMaxOldestAgeMs: number
    metricsToken: string | null
}

function getRequiredEnv(name: string) {
    const value = process.env[name]

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`)
    }

    return value
}

function getOptionalEnv(name: string, fallback: string) {
    return process.env[name] ?? fallback
}

function isValidEnvString(value: string | undefined): value is string {
    if (!value) return false
    const trimmed = value.trim()
    if (!trimmed) return false
    const lower = trimmed.toLowerCase()
    return lower !== 'null' && lower !== 'undefined' && lower !== 'none' && lower !== 'false'
}

function getNumberEnv(name: string, fallback: number) {
    const value = process.env[name]

    if (!value) {
        return fallback
    }

    const parsedValue = Number(value)

    if (Number.isNaN(parsedValue)) {
        throw new Error(`Environment variable ${name} must be a number.`)
    }

    return parsedValue
}

function getPositiveNumberEnv(name: string, fallback: number) {
    const value = getNumberEnv(name, fallback)

    if (!Number.isInteger(value) || value < 1) {
        throw new Error(`Environment variable ${name} must be a positive integer.`)
    }

    return value
}

function getNonNegativeNumberEnv(name: string, fallback: number) {
    const value = getNumberEnv(name, fallback)

    if (!Number.isInteger(value) || value < 0) {
        throw new Error(`Environment variable ${name} must be a non-negative integer.`)
    }

    return value
}

function getBoundedPositiveNumberEnv(name: string, fallback: number, maximum: number) {
    const value = getPositiveNumberEnv(name, fallback)

    if (value > maximum) {
        throw new Error(`Environment variable ${name} must be at most ${maximum}.`)
    }

    return value
}

function getBoundedNonNegativeNumberEnv(name: string, fallback: number, maximum: number) {
    const value = getNonNegativeNumberEnv(name, fallback)

    if (value > maximum) {
        throw new Error(`Environment variable ${name} must be at most ${maximum}.`)
    }

    return value
}

function getBoundedRatioEnv(name: string, fallback: number, maximum: number) {
    const value = getNumberEnv(name, fallback)

    if (!Number.isFinite(value) || value <= 0 || value > maximum) {
        throw new Error(`Environment variable ${name} must be greater than zero and at most ${maximum}.`)
    }

    return value
}

function getBooleanEnv(name: string, fallback: boolean) {
    const value = process.env[name]

    if (!value) {
        return fallback
    }

    if (value === 'true') {
        return true
    }

    if (value === 'false') {
        return false
    }

    throw new Error(`Environment variable ${name} must be true or false.`)
}

function getNodeEnv() {
    const value = getOptionalEnv('NODE_ENV', 'development')

    if (!NODE_ENVS.includes(value as NodeEnv)) {
        throw new Error(
            `NODE_ENV must be one of: ${NODE_ENVS.join(', ')}.`
        )
    }

    return value as NodeEnv
}

function getJwtExpiresInEnv(name: string, fallback: string) {
    return getOptionalEnv(name, fallback) as SignOptions['expiresIn']
}

function getOAuthRedirectUriEnv(name: string, fallback: string, nodeEnv: NodeEnv) {
    return validateOAuthRedirectUri(
        getOptionalEnv(name, fallback),
        nodeEnv === 'production',
    )
}

function getListEnv(name: string, fallback: string[]) {
    const value = process.env[name]

    if (!value) {
        return fallback
    }

    const items = value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)

    return items.length > 0 ? items : fallback
}

function getTrustedProxyConfig(nodeEnv: NodeEnv): EnvConfig['trustedProxy'] {
    const hops = getNumberEnv('TRUSTED_PROXY_HOPS', 0)
    const cidrs = getListEnv('TRUSTED_PROXY_CIDRS', [])

    if (!Number.isInteger(hops) || hops < 0) {
        throw new Error(
            'Environment variable TRUSTED_PROXY_HOPS must be a non-negative integer.'
        )
    }

    validateTrustedProxyConfig({ hops, cidrs })

    if (hops === 0 && cidrs.length > 0) {
        throw new Error(
            'TRUSTED_PROXY_CIDRS requires TRUSTED_PROXY_HOPS to be greater than zero.'
        )
    }

    if (nodeEnv === 'production' && hops > 0 && cidrs.length === 0) {
        throw new Error(
            'Production trusted proxy configuration requires TRUSTED_PROXY_CIDRS.'
        )
    }

    return { hops, cidrs }
}

function parseConnectionUrl(value: string, name: string) {
    try {
        return new URL(value)
    } catch {
        throw new Error(`Environment variable ${name} must be a valid URL.`)
    }
}

function getDatabaseConfig(): EnvConfig['database'] {
    const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL
    const poolSize = getBoundedPositiveNumberEnv('DATABASE_POOL_SIZE', 10, 100)
    const poolMin = getBoundedNonNegativeNumberEnv('DATABASE_POOL_MIN', 0, 100)

    if (poolMin > poolSize) {
        throw new Error('DATABASE_POOL_MIN cannot be greater than DATABASE_POOL_SIZE.')
    }

    const runtimeConfig = {
        poolSize,
        poolMin,
        idleTimeoutMs: getBoundedPositiveNumberEnv('DATABASE_IDLE_TIMEOUT_MS', 10_000, 600_000),
        connectionTimeoutMs: getBoundedPositiveNumberEnv('DATABASE_CONNECTION_TIMEOUT_MS', 5_000, 120_000),
        queryTimeoutMs: getBoundedPositiveNumberEnv('DATABASE_QUERY_TIMEOUT_MS', 10_000, 120_000),
        statementTimeoutMs: getBoundedPositiveNumberEnv('DATABASE_STATEMENT_TIMEOUT_MS', 10_000, 120_000),
        slowQueryThresholdMs: getBoundedPositiveNumberEnv('DATABASE_SLOW_QUERY_THRESHOLD_MS', 750, 120_000),
        maxActiveRatio: getBoundedRatioEnv('DATABASE_MAX_ACTIVE_RATIO', 0.9, 1),
        maxWaitingRequests: getBoundedNonNegativeNumberEnv('DATABASE_MAX_WAITING_REQUESTS', 10, 10_000),
    }

    if (!isValidEnvString(databaseUrl)) {
        return {
            url: null,
            host: getRequiredEnv('DATABASE_HOST'),
            port: getNumberEnv('DATABASE_PORT', 5432),
            username: getRequiredEnv('DATABASE_USER'),
            password: getRequiredEnv('DATABASE_PASSWORD'),
            name: getRequiredEnv('DATABASE_NAME'),
            ...runtimeConfig,
        }
    }

    const parsedUrl = parseConnectionUrl(databaseUrl, 'DATABASE_URL')

    return {
        url: databaseUrl,
        host: parsedUrl.hostname,
        port: parsedUrl.port ? Number(parsedUrl.port) : 5432,
        username: decodeURIComponent(parsedUrl.username),
        password: decodeURIComponent(parsedUrl.password),
        name: decodeURIComponent(parsedUrl.pathname.replace(/^\//, '')),
        ...runtimeConfig,
    }
}

function getRedisConfig(): EnvConfig['redis'] {
    const redisUrl = process.env.REDIS_URL
    const redisHost = process.env.REDIS_HOST

    if (!isValidEnvString(redisUrl) && !isValidEnvString(redisHost)) {
        return {
            enabled: false,
            url: null,
            host: 'localhost',
            port: getNumberEnv('REDIS_PORT', 6379),
            password: process.env.REDIS_PASSWORD ?? null,
        }
    }

    if (!isValidEnvString(redisUrl)) {
        return {
            enabled: true,
            url: null,
            host: redisHost ?? 'localhost',
            port: getNumberEnv('REDIS_PORT', 6379),
            password: process.env.REDIS_PASSWORD ?? null,
        }
    }

    const parsedUrl = parseConnectionUrl(redisUrl, 'REDIS_URL')

    return {
        enabled: true,
        url: redisUrl,
        host: parsedUrl.hostname,
        port: parsedUrl.port ? Number(parsedUrl.port) : 6379,
        password: parsedUrl.password
            ? decodeURIComponent(parsedUrl.password)
            : null,
    }
}

function getMailConfig(nodeEnv: NodeEnv): EnvConfig['mail'] {
    const mode = getOptionalEnv(
        'MAIL_MODE',
        nodeEnv === 'production' ? 'smtp' : 'logger'
    )

    if (mode === 'logger') {
        assertMailModeAllowed(nodeEnv, mode)
        return {
            mode,
        }
    }

    if (mode !== 'smtp') {
        throw new Error('MAIL_MODE must be logger or smtp.')
    }

    const requiredSmtpEnvNames = [
        'SMTP_HOST',
        'SMTP_USER',
        'SMTP_PASSWORD',
        'MAIL_FROM',
    ] as const
    const isSmtpConfigured = requiredSmtpEnvNames.every(
        (name) => Boolean(process.env[name])
    )

    if (!isSmtpConfigured) {
        if (nodeEnv === 'production') {
            throw new Error(
                `MAIL_MODE=smtp requires ${requiredSmtpEnvNames.join(', ')} in production.`
            )
        }

        return {
            mode: 'logger',
        }
    }

    return {
        mode,
        host: getRequiredEnv('SMTP_HOST'),
        port: getNumberEnv('SMTP_PORT', 587),
        secure: getBooleanEnv('SMTP_SECURE', false),
        user: getRequiredEnv('SMTP_USER'),
        password: getRequiredEnv('SMTP_PASSWORD'),
        from: getRequiredEnv('MAIL_FROM'),
    }
}

function getOutboxTokenEncryptionKey(nodeEnv: NodeEnv) {
    const configuredKey = process.env.OUTBOX_TOKEN_ENCRYPTION_KEY?.trim()

    if (!configuredKey) {
        if (nodeEnv === 'production') {
            throw new Error('OUTBOX_TOKEN_ENCRYPTION_KEY is required in production.')
        }

        return process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? getRequiredEnv('JWT_ACCESS_SECRET')
    }

    if (nodeEnv === 'production' && configuredKey.length < 32) {
        throw new Error('OUTBOX_TOKEN_ENCRYPTION_KEY must be at least 32 characters in production.')
    }

    return configuredKey
}

function getCorsOrigins(nodeEnv: NodeEnv, defaultOrigin: string) {
    const configuredOrigins = getListEnv('CORS_ORIGINS', [defaultOrigin]).map((origin) =>
        normalizeFrontendOrigin(origin, { allowHttpLoopback: nodeEnv !== 'production' }))

    if (nodeEnv === 'production') {
        return configuredOrigins
    }

    return [...new Set([
        ...configuredOrigins,
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
    ])]
}

const nodeEnv = getNodeEnv()
const configuredDeploymentMarket = process.env.DEPLOYMENT_MARKET ?? process.env.VITE_DEPLOYMENT_MARKET
const resolvedDeploymentMarket = resolveDeploymentMarket(configuredDeploymentMarket)

if (resolvedDeploymentMarket.usedFallback) {
    console.warn(
        `[AutoCare Hub] Unsupported DEPLOYMENT_MARKET "${configuredDeploymentMarket}"; using restrictive "ru" capabilities.`,
    )
}

const breachedPasswordCheckMode = resolveBreachedPasswordCheckMode({
    nodeEnv,
    configuredMode: process.env.BREACHED_PASSWORD_CHECK_MODE,
})
const breachedPasswordClientPolicy = getBreachedPasswordClientPolicy(breachedPasswordCheckMode)
const stripeCredentials = getStripeConfig(nodeEnv, {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
})
const stripeRequestTimeoutMs = getBoundedPositiveNumberEnv('STRIPE_REQUEST_TIMEOUT_MS', 8_000, 120_000)
const stripeMaxNetworkRetries = getBoundedNonNegativeNumberEnv('STRIPE_MAX_NETWORK_RETRIES', 2, 3)
resolveExternalPaymentProviderConfig({
    ...stripeCredentials,
    nodeEnv,
    requestTimeoutMs: stripeRequestTimeoutMs,
    maxNetworkRetries: stripeMaxNetworkRetries,
})
const defaultFrontendOrigin = getOptionalEnv('CORS_ORIGIN', 'http://localhost:5173')
const corsOrigins = getCorsOrigins(nodeEnv, defaultFrontendOrigin)
const auditLogRetentionDays = normalizeAuditLogRetentionDays(
    getPositiveNumberEnv('AUDIT_LOG_RETENTION_DAYS', 365),
)
const securityEventIpRetentionDays = normalizeSecurityEventIpRetentionDays(
    getBoundedPositiveNumberEnv(
        'SECURITY_EVENT_IP_RETENTION_DAYS',
        DEFAULT_SECURITY_EVENT_IP_RETENTION_DAYS,
        365,
    ),
    auditLogRetentionDays,
)

export const env: EnvConfig = {
    nodeEnv,
    runtimeMode: normalizeRuntimeMode(process.env.RUNTIME_MODE),
    port: getNumberEnv('PORT', 4000),
    host: getOptionalEnv('HOST', '0.0.0.0'),
    trustedProxy: getTrustedProxyConfig(nodeEnv),
    cabinetPhotoAllowedHosts: getListEnv('CABINET_PHOTO_ALLOWED_HOSTS', []),
    cabinetImageStorageProvider: resolveCabinetImageStorageProvider(
        process.env.CABINET_IMAGE_STORAGE_PROVIDER,
    ),
    cabinetUploadsDir: resolveCabinetUploadsDir(process.env.CABINET_UPLOADS_DIR),
    corsOrigins,
    frontendOrigin: normalizeFrontendOrigin(
        getOptionalEnv('FRONTEND_ORIGIN', defaultFrontendOrigin),
        { allowHttpLoopback: nodeEnv !== 'production' },
    ),
    deployment: getDeploymentCapabilities(resolvedDeploymentMarket.market),
    database: getDatabaseConfig(),
    redis: getRedisConfig(),
    auth: {
        jwtAccessSecret:
            process.env.JWT_ACCESS_SECRET ?? getRequiredEnv('JWT_SECRET'),
        jwtAccessExpiresIn: getJwtExpiresInEnv('JWT_ACCESS_EXPIRES_IN', '15m'),
        jwtRefreshSecret:
            process.env.JWT_REFRESH_SECRET ??
            process.env.JWT_SECRET ??
            getRequiredEnv('JWT_ACCESS_SECRET'),
        jwtRefreshExpiresIn: getJwtExpiresInEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
        refreshTokenCookieName: getOptionalEnv(
            'REFRESH_TOKEN_COOKIE_NAME',
            'autocarehub_refresh_token'
        ),
        csrfTokenCookieName: getOptionalEnv(
            'CSRF_TOKEN_COOKIE_NAME',
            'autocarehub_csrf_token'
        ),
        breachedPasswordCheckMode,
        breachedPasswordCheckTimeoutMs: breachedPasswordClientPolicy.timeoutMs,
    },
    bootstrap: {
        superAdminEmail: process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL ?? null,
        superAdminName: getOptionalEnv('BOOTSTRAP_SUPER_ADMIN_NAME', 'Super Admin'),
    },
    outboxTokenEncryptionKey: getOutboxTokenEncryptionKey(nodeEnv),
    mail: getMailConfig(nodeEnv),
    oauth: {
        stateCookieName: getOptionalEnv(
            'OAUTH_STATE_COOKIE_NAME',
            'autocarehub_oauth_state'
        ),
        requestTimeoutMs: getBoundedPositiveNumberEnv('OAUTH_REQUEST_TIMEOUT_MS', 5_000, 120_000),
        maxRetries: getBoundedNonNegativeNumberEnv('OAUTH_MAX_RETRIES', 2, 3),
        google: {
            clientId: getOptionalEnv('GOOGLE_OAUTH_CLIENT_ID', 'dev-google-client-id'),
            clientSecret: getOptionalEnv(
                'GOOGLE_OAUTH_CLIENT_SECRET',
                'dev-google-client-secret'
            ),
            redirectUri: getOAuthRedirectUriEnv(
                'GOOGLE_OAUTH_REDIRECT_URI',
                'http://localhost:4000/auth/oauth/google/callback',
                nodeEnv,
            ),
        },
        yandex: {
            clientId: getOptionalEnv('YANDEX_OAUTH_CLIENT_ID', 'dev-yandex-client-id'),
            clientSecret: getOptionalEnv(
                'YANDEX_OAUTH_CLIENT_SECRET',
                'dev-yandex-client-secret'
            ),
            redirectUri: getOAuthRedirectUriEnv(
                'YANDEX_OAUTH_REDIRECT_URI',
                'http://localhost:4000/auth/oauth/yandex/callback',
                nodeEnv,
            ),
        },
    },
    stripe: {
        ...stripeCredentials,
        requestTimeoutMs: stripeRequestTimeoutMs,
        maxNetworkRetries: stripeMaxNetworkRetries,
    },
    auditLogRetentionDays,
    securityEventIpRetentionDays,
    notificationRetentionDays: getBoundedPositiveNumberEnv('NOTIFICATION_RETENTION_DAYS', 180, 730),
    bookingReminderHours: getBoundedPositiveNumberEnv(
        'BOOKING_REMINDER_HOURS',
        DEFAULT_BOOKING_REMINDER_HOURS,
        MAX_BOOKING_REMINDER_HOURS,
    ),
    cabinetUploadOrphanGraceHours: getPositiveNumberEnv('CABINET_UPLOAD_ORPHAN_GRACE_HOURS', 24),
    backgroundJobShutdownTimeoutMs: getPositiveNumberEnv('BACKGROUND_JOB_SHUTDOWN_TIMEOUT_MS', 15_000),
    backgroundJobCycleTimeoutMs: getBoundedPositiveNumberEnv('BACKGROUND_JOB_CYCLE_TIMEOUT_MS', 60_000, 300_000),
    backgroundJobPhaseTimeoutMs: getBoundedPositiveNumberEnv('BACKGROUND_JOB_PHASE_TIMEOUT_MS', 15_000, 300_000),
    healthProbeTimeoutMs: getPositiveNumberEnv('HEALTH_PROBE_TIMEOUT_MS', 1_500),
    authCleanupBatchSize: getBoundedPositiveNumberEnv('AUTH_CLEANUP_BATCH_SIZE', 1_000, 10_000),
    outboxMaxPending: parseHealthThreshold(process.env.OUTBOX_MAX_PENDING, 1_000, 1_000_000),
    outboxMaxDeadLetter: parseHealthThreshold(process.env.OUTBOX_MAX_DEAD_LETTER, 0, 1_000_000),
    outboxMaxOldestAgeMs: parseHealthThreshold(process.env.OUTBOX_MAX_OLDEST_AGE_MS, 900_000, 604_800_000),
    metricsToken: isValidEnvString(process.env.METRICS_TOKEN)
        ? process.env.METRICS_TOKEN!.trim()
        : null,
}
