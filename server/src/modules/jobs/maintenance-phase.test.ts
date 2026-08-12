import { describe, expect, it, vi } from 'vitest'

import { metrics } from '../../shared/observability/metrics.js'
import {
    getMaintenancePhaseRetryLimit,
    runMaintenancePhase,
    runMaintenancePhaseWithFailurePolicy,
} from './maintenance-phase.js'

describe('maintenance phase runner', () => {
    it('checks the lease before and after a successful phase', async () => {
        const assertLease = vi.fn()

        await expect(runMaintenancePhase({
            phase: 'outbox',
            assertLease,
            timeoutMs: 1_000,
            task: async () => 'complete',
        })).resolves.toBe('complete')

        expect(assertLease).toHaveBeenCalledTimes(2)
        expect(metrics.snapshot().counters).toEqual(expect.arrayContaining([
            expect.objectContaining({
                name: 'maintenance_phase_runs_total',
                labels: { phase: 'outbox', outcome: 'success' },
            }),
        ]))
    })

    it('records a failed phase and rethrows the original error', async () => {
        const failure = new Error('phase failed')

        await expect(runMaintenancePhase({
            phase: 'payment_reconciliation',
            timeoutMs: 1_000,
            task: async () => {
                throw failure
            },
        })).rejects.toBe(failure)

        expect(metrics.snapshot().counters).toEqual(expect.arrayContaining([
            expect.objectContaining({
                name: 'maintenance_phase_runs_total',
                labels: { phase: 'payment_reconciliation', outcome: 'failed' },
            }),
        ]))
    })

    it('fails a phase independently when its timeout is exceeded', async () => {
        await expect(runMaintenancePhase({
            phase: 'stripe_webhook',
            timeoutMs: 1,
            task: () => new Promise(() => undefined),
        })).rejects.toMatchObject({ name: 'OperationTimeoutError' })
    })

    it('defers ordinary dependency failures to the next scheduled cycle', async () => {
        await expect(runMaintenancePhaseWithFailurePolicy({
            phase: 'audit_cleanup',
            timeoutMs: 1_000,
            task: async () => {
                throw new Error('database temporarily unavailable')
            },
        })).resolves.toEqual({
            ok: false,
            failure: { phase: 'audit_cleanup', errorClass: 'dependency' },
        })

        expect(metrics.snapshot().counters).toEqual(expect.arrayContaining([
            expect.objectContaining({
                name: 'maintenance_phase_failure_policy_total',
                labels: {
                    phase: 'audit_cleanup',
                    errorClass: 'dependency',
                    decision: 'continue_next_cycle',
                },
            }),
        ]))
    })

    it('retries only the phases with idempotent side effects', async () => {
        const task = vi.fn()
            .mockRejectedValueOnce(new Error('temporary database failure'))
            .mockResolvedValueOnce('recovered')

        await expect(runMaintenancePhaseWithFailurePolicy({
            phase: 'audit_cleanup',
            timeoutMs: 1_000,
            task,
        })).resolves.toEqual({ ok: true, value: 'recovered' })

        expect(task).toHaveBeenCalledTimes(2)
        expect(getMaintenancePhaseRetryLimit('audit_cleanup')).toBe(2)
        expect(getMaintenancePhaseRetryLimit('outbox')).toBe(1)
        expect(getMaintenancePhaseRetryLimit('payment_refund_reconciliation')).toBe(2)
        expect(getMaintenancePhaseRetryLimit('payment_invoice_backfill')).toBe(2)
        expect(metrics.snapshot().counters).toEqual(expect.arrayContaining([
            expect.objectContaining({
                name: 'maintenance_phase_retries_total',
                labels: { phase: 'audit_cleanup', errorClass: 'dependency' },
            }),
        ]))
    })

    it('does not retry outbox delivery in the same cycle', async () => {
        const task = vi.fn().mockRejectedValue(new Error('mailer unavailable'))

        await expect(runMaintenancePhaseWithFailurePolicy({
            phase: 'outbox',
            timeoutMs: 1_000,
            task,
        })).resolves.toEqual({
            ok: false,
            failure: { phase: 'outbox', errorClass: 'dependency' },
        })

        expect(task).toHaveBeenCalledTimes(1)
    })

    it('aborts the cycle for a timeout or a lost lease', async () => {
        await expect(runMaintenancePhaseWithFailurePolicy({
            phase: 'payment_reconciliation',
            timeoutMs: 1,
            task: () => new Promise(() => undefined),
        })).rejects.toMatchObject({ name: 'OperationTimeoutError' })

        await expect(runMaintenancePhaseWithFailurePolicy({
            phase: 'payment_reconciliation',
            timeoutMs: 1_000,
            task: async () => {
                throw new Error('Maintenance lease was lost before reconciliation')
            },
        })).rejects.toThrow('Maintenance lease was lost')
    })

    it('retries refund reconciliation because the transition is idempotent', async () => {
        const task = vi.fn()
            .mockRejectedValueOnce(new Error('temporary Stripe failure'))
            .mockResolvedValueOnce({ checked: 1, repaired: 1, skipped: 0, errors: 0 })

        await expect(runMaintenancePhaseWithFailurePolicy({
            phase: 'payment_refund_reconciliation',
            timeoutMs: 1_000,
            task,
        })).resolves.toEqual({
            ok: true,
            value: { checked: 1, repaired: 1, skipped: 0, errors: 0 },
        })
        expect(task).toHaveBeenCalledTimes(2)
    })

    it('retries invoice backfill because inserts are conflict-safe', async () => {
        const task = vi.fn()
            .mockRejectedValueOnce(new Error('temporary database failure'))
            .mockResolvedValueOnce({ checked: 1, created: 1, skipped: 0, errors: 0 })

        await expect(runMaintenancePhaseWithFailurePolicy({
            phase: 'payment_invoice_backfill',
            timeoutMs: 1_000,
            task,
        })).resolves.toEqual({
            ok: true,
            value: { checked: 1, created: 1, skipped: 0, errors: 0 },
        })
        expect(task).toHaveBeenCalledTimes(2)
    })
})
