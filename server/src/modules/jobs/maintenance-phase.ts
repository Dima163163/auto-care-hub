import { metrics } from '../../shared/observability/metrics.js'
import { withTimeout } from '../../shared/lifecycle/with-timeout.js'
import { classifyMaintenanceError, type MaintenanceErrorClass } from './maintenance-error.js'

export type MaintenancePhase =
    | 'reminders'
    | 'outbox'
    | 'auth_cleanup'
    | 'audit_cleanup'
    | 'notification_cleanup'
    | 'orphan_image_cleanup'
    | 'trust_reassessment'

export type MaintenancePhaseFailure = {
    phase: MaintenancePhase
    errorClass: MaintenanceErrorClass
}

export type MaintenancePhaseRunResult<T> =
    | { ok: true; value: T }
    | { ok: false; failure: MaintenancePhaseFailure }

const retryableMaintenancePhases = new Set<MaintenancePhase>([
    'reminders',
    'auth_cleanup',
    'audit_cleanup',
    'notification_cleanup',
])

export function getMaintenancePhaseRetryLimit(phase: MaintenancePhase) {
    return retryableMaintenancePhases.has(phase) ? 2 : 1
}

export async function runMaintenancePhase<T>(input: {
    phase: MaintenancePhase
    task: () => Promise<T>
    assertLease?: () => void
    timeoutMs: number
}) {
    const startedAt = Date.now()
    input.assertLease?.()

    try {
        const result = await withTimeout(
            `maintenance phase ${input.phase}`,
            input.task,
            input.timeoutMs,
        )
        input.assertLease?.()
        metrics.increment('maintenance_phase_runs_total', 1, {
            phase: input.phase,
            outcome: 'success',
        })
        return result
    } catch (error: unknown) {
        metrics.increment('maintenance_phase_runs_total', 1, {
            phase: input.phase,
            outcome: 'failed',
        })
        metrics.setGauge('maintenance_phase_last_failure_at_ms', Date.now(), {
            phase: input.phase,
        })
        throw error
    } finally {
        metrics.observe('maintenance_phase_duration_ms', Date.now() - startedAt, {
            phase: input.phase,
        })
    }
}

/**
 * A dependency failure is isolated until the next scheduled cycle. Lease loss
 * and timeouts abort the cycle because the underlying operation may still be
 * active and must not overlap with a new phase.
 */
export async function runMaintenancePhaseWithFailurePolicy<T>(input: {
    phase: MaintenancePhase
    task: () => Promise<T>
    assertLease?: () => void
    timeoutMs: number
}): Promise<MaintenancePhaseRunResult<T>> {
    const retryLimit = getMaintenancePhaseRetryLimit(input.phase)
    for (let attempt = 1; attempt <= retryLimit; attempt += 1) {
        try {
            return { ok: true, value: await runMaintenancePhase(input) }
        } catch (error: unknown) {
            const errorClass = classifyMaintenanceError(error)
            const abortCycle = errorClass === 'lease_lost' || errorClass === 'timeout'
            if (abortCycle) {
                metrics.increment('maintenance_phase_failure_policy_total', 1, {
                    phase: input.phase,
                    errorClass,
                    decision: 'abort_cycle',
                })
                throw error
            }

            if (attempt < retryLimit) {
                metrics.increment('maintenance_phase_retries_total', 1, {
                    phase: input.phase,
                    errorClass,
                })
                continue
            }

            metrics.increment('maintenance_phase_failure_policy_total', 1, {
                phase: input.phase,
                errorClass,
                decision: 'continue_next_cycle',
            })
            return {
                ok: false,
                failure: { phase: input.phase, errorClass },
            }
        }
    }

    throw new Error(`Maintenance phase ${input.phase} did not produce an outcome.`)
}
