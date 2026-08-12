import { access, constants, mkdir } from 'node:fs/promises'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { In } from 'typeorm'

import { env } from '../config/env.js'
import { AppDataSource } from '../database/data-source.js'
import { getDatabasePoolStats, isDatabaseConnected } from '../database/database.js'
import { evaluateDatabasePoolPressure } from '../database/database-pool-pressure.js'
import { OutboxEventEntity, OutboxEventStatus } from '../entities/outbox/outbox-event.entity.js'
import {
    SystemIncidentSeverity,
    SystemIncidentType,
} from '../entities/system-incident/system-incident.entity.js'
import { recordSystemIncidentSafely } from '../modules/admin/system-incidents.service.js'
import { CABINET_UPLOADS_DIR } from '../modules/cabinets/cabinet-image-storage.js'
import { getOutboxHealthSummary } from '../modules/outbox/outbox-health.service.js'
import { getRedisClient, isRedisEnabled } from '../shared/redis/redis.js'
import { metrics } from '../shared/observability/metrics.js'
import {
    DEFAULT_HEALTH_INCIDENT_COOLDOWN_MS,
    shouldEmitHealthIncident,
} from '../shared/observability/health-incident-cooldown.js'
import {
    evaluateOutboxReadiness,
    type OutboxReadinessReason,
    type OutboxReadinessResult,
} from './outbox-readiness.js'
import { assertHealthProbeTimeout } from './health-probe-policy.js'
import { getHealthStatus } from './health-status-policy.js'
import {
    assertSchemaContract,
    getSchemaContractReasonCodes,
    getSchemaContractStatus,
    SchemaContractError,
    type SchemaContractReasonCode,
} from '../database/schema-contract.js'

type ProbeStatus = 'ok' | 'failed' | 'skipped'
export type ProbeReason =
    | 'timeout'
    | 'unavailable'
    | 'not_connected'
    | 'not_configured'
    | 'database_unavailable'
    | 'schema_contract_incomplete'

type Probe = {
    status: ProbeStatus
    latencyMs: number
    reason?: ProbeReason
    reasonCodes?: SchemaContractReasonCode[]
}

type OutboxProbe = Probe & {
    pending: number | null
    deadLetter: number | null
    oldestAgeMs: number | null
}

export type HealthResponse = {
    status: 'ok' | 'degraded'
    service: 'autocare-hub-api'
    database: 'connected' | 'disconnected'
    checks: {
        database: Probe
        redis: Probe
        outbox: OutboxProbe
        storage: Probe
    }
}

const outboxReadinessReasons: OutboxReadinessReason[] = [
    'pending_threshold_exceeded',
    'dead_letter_threshold_exceeded',
    'oldest_age_threshold_exceeded',
]

const activeOutboxStatuses = [
    OutboxEventStatus.Pending,
    OutboxEventStatus.Processing,
    OutboxEventStatus.Failed,
]

const healthIncidentLastEmittedAt = new Map<string, number>()

async function recordHealthIncidentWithCooldown(input: Parameters<typeof recordSystemIncidentSafely>[0]) {
    const lastEmittedAt = healthIncidentLastEmittedAt.get(input.title) ?? null
    const now = Date.now()
    if (!shouldEmitHealthIncident(lastEmittedAt, now, DEFAULT_HEALTH_INCIDENT_COOLDOWN_MS)) return

    await recordSystemIncidentSafely(input)
    healthIncidentLastEmittedAt.set(input.title, now)
}

function skippedProbe(): Probe {
    return { status: 'skipped', latencyMs: 0, reason: 'not_configured' }
}

function skippedOutboxProbe(): OutboxProbe {
    return {
        ...skippedProbe(),
        pending: null,
        deadLetter: null,
        oldestAgeMs: null,
        reason: 'database_unavailable',
    }
}

export function getProbeFailureReason(error: unknown): ProbeReason {
    if (error instanceof Error && error.message.startsWith('Database schema contract is incomplete:')) {
        return 'schema_contract_incomplete'
    }
    return error instanceof Error && error.message.endsWith('probe timed out.')
        ? 'timeout'
        : 'unavailable'
}

async function withTimeout<T>(name: string, task: () => Promise<T>) {
    const timeoutMs = assertHealthProbeTimeout(env.healthProbeTimeoutMs)
    let timeoutHandle: NodeJS.Timeout | undefined

    try {
        return await Promise.race([
            task(),
            new Promise<T>((_, reject) => {
                timeoutHandle = setTimeout(() => {
                    reject(new Error(`${name} probe timed out.`))
                }, timeoutMs)
            }),
        ])
    } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle)
    }
}

async function runProbe<T extends object>(name: string, task: () => Promise<T>): Promise<Probe & T> {
    const startedAt = Date.now()

    try {
        const details = await withTimeout(name, task)
        return {
            status: 'ok',
            latencyMs: Date.now() - startedAt,
            ...details,
        }
    } catch (error: unknown) {
        return {
            status: 'failed',
            latencyMs: Date.now() - startedAt,
            reason: getProbeFailureReason(error),
            reasonCodes: error instanceof SchemaContractError
                ? getSchemaContractReasonCodes(error.status)
                : undefined,
        } as Probe & T
    }
}

async function probeDatabase(): Promise<Probe> {
    if (!isDatabaseConnected()) {
        return { status: 'failed', latencyMs: 0, reason: 'not_connected' }
    }

    return runProbe('postgresql', async () => {
        await AppDataSource.query('SELECT 1')
        assertSchemaContract(await getSchemaContractStatus())
        return {}
    })
}

async function probeRedis(): Promise<Probe> {
    if (!isRedisEnabled()) return skippedProbe()

    return runProbe('redis', async () => {
        await getRedisClient().ping()
        return {}
    })
}

async function probeStorage(): Promise<Probe> {
    return runProbe('storage', async () => {
        await mkdir(CABINET_UPLOADS_DIR, { recursive: true })
        await access(CABINET_UPLOADS_DIR, constants.R_OK | constants.W_OK)
        return {}
    })
}

async function probeOutbox(): Promise<Omit<OutboxProbe, 'status' | 'latencyMs'>> {
    const repository = AppDataSource.getRepository(OutboxEventEntity)
    const [pending, deadLetter, oldest] = await Promise.all([
        repository.count({ where: { status: In(activeOutboxStatuses) } }),
        repository.countBy({ status: OutboxEventStatus.DeadLetter }),
        repository
            .createQueryBuilder('event')
            .select('event.createdAt', 'createdAt')
            .where('event.status IN (:...statuses)', { statuses: activeOutboxStatuses })
            .orderBy('event.createdAt', 'ASC')
            .getRawOne<{ createdAt: Date | string } | undefined>(),
    ])

    return getOutboxHealthSummary({
        pending,
        deadLetter,
        oldestCreatedAt: oldest?.createdAt,
    })
}

async function getReadiness(request: FastifyRequest, reply: FastifyReply) {
    const database = await probeDatabase()
    const [redis, storage] = await Promise.all([
        probeRedis(),
        probeStorage(),
    ])
    const outbox = database.status === 'ok'
        ? await runProbe('outbox', probeOutbox)
        : skippedOutboxProbe()
    const checks = { database, redis, outbox, storage }
    const outboxThresholds: OutboxReadinessResult = outbox.status === 'ok'
        ? evaluateOutboxReadiness(outbox, {
            maxPending: env.outboxMaxPending,
            maxDeadLetter: env.outboxMaxDeadLetter,
            maxOldestAgeMs: env.outboxMaxOldestAgeMs,
        })
        : { ok: true, reasons: [] }
    const pool = getDatabasePoolStats()
    const poolPressure = pool
        ? evaluateDatabasePoolPressure(pool, {
            maxActiveRatio: env.database.maxActiveRatio,
            maxWaitingRequests: env.database.maxWaitingRequests,
        })
        : null
    const isPoolPressureFailure = poolPressure !== null && !poolPressure.ok
    const hasFailure = Object.values(checks).some((check) => check.status === 'failed')
        || !outboxThresholds.ok
        || isPoolPressureFailure

    if (pool) {
        metrics.setGauge('database_pool_total_connections', pool.total)
        metrics.setGauge('database_pool_idle_connections', pool.idle)
        metrics.setGauge('database_pool_active_connections', pool.active)
        metrics.setGauge('database_pool_waiting_requests', pool.waiting)
        metrics.setGauge('database_pool_active_ratio', poolPressure?.activeRatio ?? 0)
        metrics.setGauge('database_pool_pressure_status', isPoolPressureFailure ? 0 : 1)
    }

    for (const [dependency, check] of Object.entries(checks)) {
        metrics.setGauge('health_check_status', check.status === 'ok' ? 1 : 0, { dependency })
        metrics.observe('health_check_latency_ms', check.latencyMs, { dependency })
    }
    if (outbox.pending !== null) {
        metrics.setGauge('outbox_pending', outbox.pending)
    }
    if (outbox.deadLetter !== null) {
        metrics.setGauge('outbox_dead_letter', outbox.deadLetter)
    }
    if (outbox.oldestAgeMs !== null) {
        metrics.setGauge('outbox_oldest_age_ms', outbox.oldestAgeMs)
    }
    metrics.setGauge('outbox_readiness_status', outboxThresholds.ok ? 1 : 0)
    for (const reason of outboxReadinessReasons) {
        metrics.setGauge(
            'outbox_readiness_threshold_breach',
            outboxThresholds.reasons.includes(reason) ? 1 : 0,
            { reason },
        )
    }

    if (!outboxThresholds.ok) {
        await recordHealthIncidentWithCooldown({
            type: SystemIncidentType.HealthCheck,
            severity: SystemIncidentSeverity.Critical,
            title: 'Outbox backlog exceeded readiness threshold',
            requestId: request.id,
            metadata: {
                reasons: outboxThresholds.reasons,
                pending: outbox.pending,
                deadLetter: outbox.deadLetter,
                oldestAgeMs: outbox.oldestAgeMs,
                maxPending: env.outboxMaxPending,
                maxDeadLetter: env.outboxMaxDeadLetter,
                maxOldestAgeMs: env.outboxMaxOldestAgeMs,
                statusCode: 503,
            },
        })
    }

    if (isPoolPressureFailure) {
        await recordHealthIncidentWithCooldown({
            type: SystemIncidentType.HealthCheck,
            severity: SystemIncidentSeverity.Critical,
            title: 'Database pool pressure exceeded threshold',
            requestId: request.id,
            metadata: {
                reasons: poolPressure.reasons,
                activeRatio: poolPressure.activeRatio,
                waiting: pool?.waiting ?? null,
                maxActiveRatio: env.database.maxActiveRatio,
                maxWaitingRequests: env.database.maxWaitingRequests,
                statusCode: 503,
            },
        })
    }

    if (hasFailure) {
        await recordHealthIncidentWithCooldown({
            type: SystemIncidentType.HealthCheck,
            severity: SystemIncidentSeverity.Critical,
            title: 'Readiness health check is degraded',
            requestId: request.id,
            metadata: {
                database: database.status,
                redis: redis.status,
                outbox: outbox.status,
                storage: storage.status,
                statusCode: 503,
            },
        })
    }

    const response: HealthResponse = {
        status: getHealthStatus(hasFailure),
        service: 'autocare-hub-api',
        database: database.status === 'ok' ? 'connected' : 'disconnected',
        checks,
    }

    return reply.status(hasFailure ? 503 : 200).send(response)
}

export async function healthRoutes(app: FastifyInstance) {
    app.get('/health/live', async (_request, reply) =>
        reply.status(200).send({ status: 'ok', service: 'autocare-hub-api' })
    )

    app.get('/health/ready', async (request, reply) =>
        getReadiness(request, reply)
    )

    app.get('/health', async (request, reply) =>
        getReadiness(request, reply)
    )
}
