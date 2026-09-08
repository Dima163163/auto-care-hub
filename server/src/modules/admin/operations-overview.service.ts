import { MoreThanOrEqual } from 'typeorm'

import { env } from '../../config/env.js'
import { AppDataSource } from '../../database/data-source.js'
import { evaluateDatabasePoolPressure } from '../../database/database-pool-pressure.js'
import { getDatabasePoolStats, isDatabaseConnected } from '../../database/database.js'
import {
    getSchemaContractReasonCodes,
    getSchemaContractStatus,
    type SchemaContractReasonCode,
    type SchemaContractStatus,
} from '../../database/schema-contract.js'
import { OutboxEventEntity, OutboxEventStatus } from '../../entities/outbox/outbox-event.entity.js'
import { SystemIncidentEntity, SystemIncidentSeverity, SystemIncidentStatus } from '../../entities/system-incident/system-incident.entity.js'
import { UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { isSuperAdmin } from '../../shared/auth/roles.js'
import { metrics } from '../../shared/observability/metrics.js'
import { getRedisClient, isRedisEnabled } from '../../shared/redis/redis.js'
import { getOutboxHealthSummary } from '../outbox/outbox-health.service.js'
import { OUTBOX_MAX_ATTEMPTS } from '../outbox/outbox.service.js'
import { evaluateOutboxReadiness, type OutboxReadinessReason } from '../../routes/outbox-readiness.js'

type DependencyStatus = 'ok' | 'failed' | 'unavailable' | 'disabled'

export type AdminOperationsOverview = {
    generatedAt: string
    overallStatus: 'healthy' | 'degraded' | 'unavailable'
    database: {
        status: 'connected' | 'failed' | 'not_connected'
        latencyMs: number
        schema: {
            status: 'complete' | 'incomplete' | 'unavailable'
            reasonCodes: SchemaContractReasonCode[]
            missingTables: string[]
            missingColumns: string[]
            missingIndexes: string[]
            missingConstraints: string[]
            missingMigrations: string[]
            aheadMigrations: string[]
        }
        pool: {
            status: 'ok' | 'pressure' | 'unavailable'
            total: number | null
            idle: number | null
            active: number | null
            waiting: number | null
            activeRatio: number | null
            reasons: Array<'active_ratio_exceeded' | 'waiting_requests_exceeded'>
            thresholds: {
                maxActiveRatio: number
                maxWaitingRequests: number
            }
        }
    }
    backend: {
        signals: {
            available: boolean
            openIncidents: number
            criticalIncidents: number
            openSecurityEvents: number
            highSecurityEvents: number
            criticalSecurityEvents: number
            blockedSecuritySignals: number
        }
        redis: {
            status: DependencyStatus
            latencyMs: number
        }
        outbox: {
            status: 'ok' | 'failed' | 'unavailable'
            latencyMs: number
            counts: Record<string, number>
            activeCount: number | null
            failedCount: number | null
            abandonedCount: number | null
            deadLetterCount: number | null
            oldestAgeMs: number | null
            readiness: {
                ok: boolean
                reasons: OutboxReadinessReason[]
                thresholds: {
                    maxPending: number
                    maxDeadLetter: number
                    maxOldestAgeMs: number
                }
            }
        }
        storage: {
            provider: string
            antivirusMode: string
        }
        runtime: {
            nodeEnv: string
            runtimeMode: string
            mailMode: string
            redisEnabled: boolean
            metricsTokenConfigured: boolean
            databaseSslRejectUnauthorized: boolean
            deploymentMarket: string
            attachmentStorageProvider: string
            attachmentAntivirusMode: string
        }
        metrics: {
            gauges: Array<{ name: string; labels: Record<string, string>; value: number }>
            counters: Array<{ name: string; labels: Record<string, string>; value: number }>
            histograms: Array<{ name: string; labels: Record<string, string>; count: number; sum: number; max: number }>
            seriesCount: number
        }
    }
}

const activeOutboxStatuses = [
    OutboxEventStatus.Pending,
    OutboxEventStatus.Processing,
    OutboxEventStatus.Failed,
]

function assertSuperAdmin(user: UserEntity) {
    if (!isSuperAdmin(user)) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'Only super admin can access the operations overview.',
        })
    }
}

function getEmptySchemaStatus(): AdminOperationsOverview['database']['schema'] {
    return {
        status: 'unavailable',
        reasonCodes: [],
        missingTables: [],
        missingColumns: [],
        missingIndexes: [],
        missingConstraints: [],
        missingMigrations: [],
        aheadMigrations: [],
    }
}

function mapSchemaStatus(status: SchemaContractStatus): AdminOperationsOverview['database']['schema'] {
    return {
        status: getSchemaContractReasonCodes(status).length > 0 ? 'incomplete' : 'complete',
        reasonCodes: getSchemaContractReasonCodes(status),
        missingTables: status.missingTables,
        missingColumns: status.missingColumns,
        missingIndexes: status.missingIndexes,
        missingConstraints: status.missingConstraints,
        missingMigrations: status.missingMigrations,
        aheadMigrations: status.aheadMigrations,
    }
}

function createUnavailableOutbox(): AdminOperationsOverview['backend']['outbox'] {
    return {
        status: 'unavailable',
        latencyMs: 0,
        counts: {},
        activeCount: null,
        failedCount: null,
        abandonedCount: null,
        deadLetterCount: null,
        oldestAgeMs: null,
        readiness: {
            ok: true,
            reasons: [],
            thresholds: {
                maxPending: env.outboxMaxPending,
                maxDeadLetter: env.outboxMaxDeadLetter,
                maxOldestAgeMs: env.outboxMaxOldestAgeMs,
            },
        },
    }
}

function createUnavailableSignals(): AdminOperationsOverview['backend']['signals'] {
    return {
        available: false,
        openIncidents: 0,
        criticalIncidents: 0,
        openSecurityEvents: 0,
        highSecurityEvents: 0,
        criticalSecurityEvents: 0,
        blockedSecuritySignals: 0,
    }
}

async function withTimeout<T>(task: () => Promise<T>) {
    let timeoutHandle: NodeJS.Timeout | undefined

    try {
        return await Promise.race([
            task(),
            new Promise<T>((_, reject) => {
                timeoutHandle = setTimeout(() => reject(new Error('operations overview probe timed out.')), env.healthProbeTimeoutMs)
            }),
        ])
    } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle)
    }
}

async function collectDatabaseOverview() {
    const pool = getDatabasePoolStats()
    const poolPressure = pool
        ? evaluateDatabasePoolPressure(pool, {
            maxActiveRatio: env.database.maxActiveRatio,
            maxWaitingRequests: env.database.maxWaitingRequests,
        })
        : null
    const poolOverview: AdminOperationsOverview['database']['pool'] = {
        status: pool ? (poolPressure?.ok ? 'ok' : 'pressure') : 'unavailable',
        total: pool?.total ?? null,
        idle: pool?.idle ?? null,
        active: pool?.active ?? null,
        waiting: pool?.waiting ?? null,
        activeRatio: poolPressure?.activeRatio ?? null,
        reasons: poolPressure?.reasons ?? [],
        thresholds: {
            maxActiveRatio: env.database.maxActiveRatio,
            maxWaitingRequests: env.database.maxWaitingRequests,
        },
    }

    if (!isDatabaseConnected()) {
        return {
            status: 'not_connected' as const,
            latencyMs: 0,
            schema: getEmptySchemaStatus(),
            pool: poolOverview,
        }
    }

    const startedAt = Date.now()
    try {
        const schema = await withTimeout(async () => {
            await AppDataSource.query('SELECT 1')
            return getSchemaContractStatus()
        })

        return {
            status: 'connected' as const,
            latencyMs: Date.now() - startedAt,
            schema: mapSchemaStatus(await schema),
            pool: poolOverview,
        }
    } catch (error: unknown) {
        const incompleteSchema = error instanceof Error && 'status' in error
            ? (error as Error & { status?: SchemaContractStatus }).status
            : undefined

        return {
            status: 'failed' as const,
            latencyMs: Date.now() - startedAt,
            schema: incompleteSchema ? mapSchemaStatus(incompleteSchema) : getEmptySchemaStatus(),
            pool: poolOverview,
        }
    }
}

async function collectRedisOverview() {
    if (!isRedisEnabled()) {
        return { status: 'disabled' as const, latencyMs: 0 }
    }

    const startedAt = Date.now()
    try {
        await withTimeout(() => getRedisClient().ping())
        return { status: 'ok' as const, latencyMs: Date.now() - startedAt }
    } catch {
        return { status: 'failed' as const, latencyMs: Date.now() - startedAt }
    }
}

async function collectOutboxOverview(): Promise<AdminOperationsOverview['backend']['outbox']> {
    const startedAt = Date.now()
    try {
        const result = await withTimeout(async () => {
            const repository = AppDataSource.getRepository(OutboxEventEntity)
            const counts = Object.fromEntries(await Promise.all(
                Object.values(OutboxEventStatus).map(async (status) => [status, await repository.countBy({ status })] as const),
            ))
            const [oldest, abandonedCount] = await Promise.all([
                repository
                    .createQueryBuilder('event')
                    .select('event.createdAt', 'createdAt')
                    .where('event.status IN (:...statuses)', { statuses: activeOutboxStatuses })
                    .orderBy('event.createdAt', 'ASC')
                    .getRawOne<{ createdAt: Date | string } | undefined>(),
                repository.count({
                    where: {
                        status: OutboxEventStatus.Failed,
                        attempts: MoreThanOrEqual(OUTBOX_MAX_ATTEMPTS),
                    },
                }),
            ])
            const activeCount = activeOutboxStatuses.reduce((total, status) => total + (counts[status] ?? 0), 0)
            const summary = getOutboxHealthSummary({
                pending: activeCount,
                deadLetter: counts[OutboxEventStatus.DeadLetter] ?? 0,
                oldestCreatedAt: oldest?.createdAt,
            })
            const readiness = evaluateOutboxReadiness(summary, {
                maxPending: env.outboxMaxPending,
                maxDeadLetter: env.outboxMaxDeadLetter,
                maxOldestAgeMs: env.outboxMaxOldestAgeMs,
            })

            return { counts, activeCount, abandonedCount, summary, readiness }
        })

        return {
            status: 'ok',
            latencyMs: Date.now() - startedAt,
            counts: result.counts,
            activeCount: result.activeCount,
            failedCount: result.counts[OutboxEventStatus.Failed] ?? 0,
            abandonedCount: result.abandonedCount,
            deadLetterCount: result.summary.deadLetter,
            oldestAgeMs: result.summary.oldestAgeMs,
            readiness: {
                ok: result.readiness.ok,
                reasons: result.readiness.reasons,
                thresholds: {
                    maxPending: env.outboxMaxPending,
                    maxDeadLetter: env.outboxMaxDeadLetter,
                    maxOldestAgeMs: env.outboxMaxOldestAgeMs,
                },
            },
        }
    } catch {
        return {
            ...createUnavailableOutbox(),
            status: 'failed',
            latencyMs: Date.now() - startedAt,
        }
    }
}

async function collectSignalsOverview(): Promise<AdminOperationsOverview['backend']['signals']> {
    try {
        const [openIncidents, criticalIncidents, securityRows] = await withTimeout(() => Promise.all([
            AppDataSource.getRepository(SystemIncidentEntity).countBy({ status: SystemIncidentStatus.Open }),
            AppDataSource.getRepository(SystemIncidentEntity).count({
                where: {
                    status: SystemIncidentStatus.Open,
                    severity: SystemIncidentSeverity.Critical,
                },
            }),
            AppDataSource.query<{
                openEvents: string | number
                highSecurityEvents: string | number
                criticalSecurityEvents: string | number
                blockedSecuritySignals: string | number
            }[]>(`
                SELECT
                    COUNT(*) FILTER (WHERE COALESCE(latest_action.status, 'open') = 'open')::int AS "openEvents",
                    COUNT(*) FILTER (WHERE security_event.severity = 'high')::int AS "highSecurityEvents",
                    COUNT(*) FILTER (WHERE security_event.severity = 'critical')::int AS "criticalSecurityEvents",
                    COUNT(*) FILTER (WHERE security_event.type IN ('rate_limit_exceeded', 'privilege_denied'))::int AS "blockedSecuritySignals"
                FROM "security_events" AS security_event
                LEFT JOIN LATERAL (
                    SELECT action.status
                    FROM "security_event_actions" AS action
                    WHERE action.security_event_id = security_event.id
                    ORDER BY action.created_at DESC, action.id DESC
                    LIMIT 1
                ) AS latest_action ON TRUE
                WHERE security_event."createdAt" >= $1
            `, [new Date(Date.now() - 1_440 * 60_000)]),
        ]))
        const security = securityRows[0]
        const toCount = (value: string | number | undefined) => {
            const parsed = Number(value ?? 0)
            return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0
        }

        return {
            available: true,
            openIncidents,
            criticalIncidents,
            openSecurityEvents: toCount(security?.openEvents),
            highSecurityEvents: toCount(security?.highSecurityEvents),
            criticalSecurityEvents: toCount(security?.criticalSecurityEvents),
            blockedSecuritySignals: toCount(security?.blockedSecuritySignals),
        }
    } catch {
        return createUnavailableSignals()
    }
}

function getSafeMetrics() {
    const snapshot = metrics.snapshot()
    const allowedPrefixes = ['database_', 'health_', 'outbox_', 'http_', 'job_']
    const isAllowed = (name: string) => allowedPrefixes.some((prefix) => name.startsWith(prefix))
    const gauges = snapshot.gauges.filter((metric) => isAllowed(metric.name))
    const counters = snapshot.counters.filter((metric) => isAllowed(metric.name))
    const histograms = snapshot.histograms.filter((metric) => isAllowed(metric.name))

    return {
        gauges,
        counters,
        histograms,
        seriesCount: gauges.length + counters.length + histograms.length,
    }
}

export async function getAdminOperationsOverview(user: UserEntity): Promise<AdminOperationsOverview> {
    assertSuperAdmin(user)

    const database = await collectDatabaseOverview()
    const [redis, outbox, signals] = await Promise.all([
        collectRedisOverview(),
        database.status === 'connected' ? collectOutboxOverview() : Promise.resolve(createUnavailableOutbox()),
        database.status === 'connected' ? collectSignalsOverview() : Promise.resolve(createUnavailableSignals()),
    ])
    const schemaIncomplete = database.schema.status === 'incomplete'
    const dependencyDegraded = redis.status === 'failed'
        || outbox.status === 'failed'
        || !outbox.readiness.ok
        || !signals.available
        || database.pool.status === 'pressure'
        || schemaIncomplete
    const overallStatus = database.status === 'not_connected'
        ? 'unavailable'
        : database.status === 'failed'
            ? 'degraded'
            : dependencyDegraded ? 'degraded' : 'healthy'

    return {
        generatedAt: new Date().toISOString(),
        overallStatus,
        database,
        backend: {
            signals,
            redis,
            outbox,
            storage: {
                provider: env.cabinetImageStorageProvider,
                antivirusMode: env.autoCareAttachments.antivirusMode,
            },
            runtime: {
                nodeEnv: env.nodeEnv,
                runtimeMode: env.runtimeMode,
                mailMode: env.mail.mode,
                redisEnabled: env.redis.enabled,
                metricsTokenConfigured: Boolean(env.metricsToken),
                databaseSslRejectUnauthorized: env.database.sslRejectUnauthorized,
                deploymentMarket: env.deployment.deploymentMarket,
                attachmentStorageProvider: env.autoCareAttachments.storageProvider,
                attachmentAntivirusMode: env.autoCareAttachments.antivirusMode,
            },
            metrics: getSafeMetrics(),
        },
    }
}
