import type { FastifyBaseLogger } from 'fastify'

import {
    runMaintenanceCycle,
    summarizeMaintenanceCycle,
} from './maintenance-jobs.service.js'
import { SystemIncidentSeverity, SystemIncidentType } from '../../entities/system-incident/system-incident.entity.js'
import { recordSystemIncidentSafely } from '../admin/system-incidents.service.js'
import type { Mailer } from '../../shared/mail/mailer.js'
import { withMaintenanceLease } from './maintenance-lease.service.js'
import { env } from '../../config/env.js'
import { metrics } from '../../shared/observability/metrics.js'
import { OperationTimeoutError, withTimeout } from '../../shared/lifecycle/with-timeout.js'
import { classifyMaintenanceError } from './maintenance-error.js'
import { serializeError } from '../../shared/observability/logger.js'

const JOB_INTERVAL_MS = 60_000

export function startBackgroundJobs(logger: FastifyBaseLogger, mailer: Mailer) {
    let isRunning = false
    let isStopping = false
    let activeRun: Promise<void> | null = null
    let runningCycle: Promise<unknown> | null = null

    const run = async () => {
        if (isRunning || isStopping) {
            metrics.increment('background_job_runs_total', 1, {
                outcome: isStopping ? 'skipped_stopping' : 'skipped_running',
            })
            return
        }
        isRunning = true
        metrics.increment('background_job_runs_total', 1, { outcome: 'started' })
        try {
            const cyclePromise = withMaintenanceLease((lease) =>
                runMaintenanceCycle(new Date(), mailer, lease)
            )
            runningCycle = cyclePromise
            const result = await withTimeout(
                'background maintenance cycle',
                () => cyclePromise,
                env.backgroundJobCycleTimeoutMs,
            )
            if (!result) {
                metrics.increment('background_job_runs_total', 1, { outcome: 'skipped_lease' })
                logger.debug('Background maintenance cycle skipped because another replica owns the lease')
                return
            }
            if (result.phaseFailures.length > 0) {
                metrics.increment('background_job_runs_total', 1, { outcome: 'partial' })
                await recordSystemIncidentSafely({
                    type: SystemIncidentType.BackgroundJob,
                    severity: SystemIncidentSeverity.Warning,
                    title: 'Background maintenance phases failed',
                    metadata: {
                        phaseFailures: result.phaseFailures,
                    },
                })
                logger.warn(
                    { phaseFailures: result.phaseFailures },
                    'Background maintenance cycle completed partially',
                )
            } else {
                metrics.increment('background_job_runs_total', 1, { outcome: 'success' })
            }
            if (result.outbox.abandoned > 0 || result.outbox.deadLetter > 0) {
                await recordSystemIncidentSafely({
                    type: SystemIncidentType.BackgroundJob,
                    severity: SystemIncidentSeverity.Critical,
                    title: 'Outbox events require operator attention',
                    metadata: {
                        abandoned: result.outbox.abandoned,
                        deadLetter: result.outbox.deadLetter,
                    },
                })
            }
            if (result.orphanImageCleanup.failed > 0) {
                await recordSystemIncidentSafely({
                    type: SystemIncidentType.BackgroundJob,
                    severity: SystemIncidentSeverity.Warning,
                    title: 'Orphaned cabinet image cleanup requires attention',
                    metadata: {
                        failed: result.orphanImageCleanup.failed,
                        scanned: result.orphanImageCleanup.scanned,
                        removed: result.orphanImageCleanup.removed,
                    },
                })
            }
            if (
                result.remindersScheduled > 0 ||
                (result.quoteExpiry?.expired ?? 0) > 0 ||
                result.outbox.claimed > 0 ||
                result.authCleanup.tokens > 0 ||
                result.authCleanup.sessions > 0 ||
                result.authCleanup.oauthLinkRequests > 0 ||
                result.auditCleanup.auditLogs > 0 ||
                result.auditCleanup.securityEvents > 0 ||
                result.orphanImageCleanup.removed > 0 ||
                result.trustReassessment.changed > 0
            ) {
                logger.info(
                    { backgroundJobs: summarizeMaintenanceCycle(result) },
                    'Background maintenance cycle completed',
                )
            }
        } catch (error) {
            metrics.increment('background_job_runs_total', 1, { outcome: 'failed' })
            if (error instanceof OperationTimeoutError) {
                metrics.increment('background_job_cycle_timeouts_total')
            }
            metrics.setGauge('background_job_last_failure_at_ms', Date.now())
            const errorClass = classifyMaintenanceError(error)
            await recordSystemIncidentSafely({
                type: SystemIncidentType.BackgroundJob,
                severity: errorClass === 'lease_lost'
                    ? SystemIncidentSeverity.Warning
                    : SystemIncidentSeverity.Critical,
                title: `Background maintenance cycle failed: ${errorClass}`,
                metadata: { errorClass },
            })
            logger.error(
                {
                    error: serializeError(error),
                    errorClass,
                },
                'Background maintenance cycle failed',
            )
        } finally {
            const cycle = runningCycle
            if (!cycle) {
                isRunning = false
            } else {
                void cycle.finally(() => {
                    if (runningCycle === cycle) {
                        runningCycle = null
                        isRunning = false
                    }
                }).catch(() => undefined)
            }
        }
    }

    const triggerRun = () => {
        if (isRunning || isStopping) return
        const runPromise = run()
        activeRun = runPromise
        void runPromise.finally(() => {
            if (activeRun === runPromise) activeRun = null
        })
    }

    const interval = setInterval(triggerRun, JOB_INTERVAL_MS)
    interval.unref()
    triggerRun()

    return async () => {
        isStopping = true
        clearInterval(interval)

        const runToWait = activeRun ?? runningCycle
        if (!runToWait) return

        let timeoutHandle: NodeJS.Timeout | undefined
        await Promise.race([
            runToWait,
            new Promise<void>((resolve) => {
                timeoutHandle = setTimeout(() => {
                    logger.warn(
                        { timeoutMs: env.backgroundJobShutdownTimeoutMs },
                        'Background maintenance drain timed out',
                    )
                    metrics.increment('background_job_shutdown_timeouts_total')
                    resolve()
                }, env.backgroundJobShutdownTimeoutMs)
            }),
        ])

        if (timeoutHandle) clearTimeout(timeoutHandle)
    }
}
