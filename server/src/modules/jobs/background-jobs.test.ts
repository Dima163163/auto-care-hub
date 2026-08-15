import type { FastifyBaseLogger } from 'fastify'
import type { Mailer } from '../../shared/mail/mailer.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    runMaintenanceCycle: vi.fn(),
    withMaintenanceLease: vi.fn(),
    recordSystemIncidentSafely: vi.fn(),
}))

vi.mock('./maintenance-jobs.service.js', () => ({
    runMaintenanceCycle: mocks.runMaintenanceCycle,
}))

vi.mock('./maintenance-lease.service.js', () => ({
    withMaintenanceLease: mocks.withMaintenanceLease,
}))

vi.mock('../admin/system-incidents.service.js', () => ({
    recordSystemIncidentSafely: mocks.recordSystemIncidentSafely,
}))

import { startBackgroundJobs } from './background-jobs.js'

function createLogger() {
    return {
        debug: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    } as unknown as FastifyBaseLogger
}

function createMaintenanceResult() {
    return {
        remindersScheduled: 0,
        outbox: { abandoned: 0, deadLetter: 0, claimed: 0 },
        authCleanup: { tokens: 0, sessions: 0, oauthLinkRequests: 0, accountDeletionRequests: 0 },
        auditCleanup: { auditLogs: 0, securityEvents: 0 },
        notificationCleanup: { notifications: 0 },
        orphanImageCleanup: { failed: 0, scanned: 0, removed: 0 },
        trustReassessment: { scanned: 0, changed: 0 },
        phaseFailures: [],
        payments: { checked: 0, errors: 0 },
        paymentRefunds: { checked: 0, errors: 0 },
        paymentInvoiceBackfill: { checked: 0, errors: 0 },
    }
}

describe('background job lifecycle', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.withMaintenanceLease.mockImplementation(async (task) => task({
            assertHeld: vi.fn(),
        }))
    })

    it('waits for the active maintenance cycle during shutdown', async () => {
        let resolveCycle!: (value: ReturnType<typeof createMaintenanceResult>) => void
        mocks.runMaintenanceCycle.mockReturnValueOnce(new Promise((resolve) => {
            resolveCycle = resolve
        }))

        const logger = createLogger()
        const stop = startBackgroundJobs(logger, {} as Mailer)
        const stopPromise = stop()

        let stopped = false
        void stopPromise.then(() => {
            stopped = true
        })
        await Promise.resolve()
        expect(stopped).toBe(false)

        resolveCycle(createMaintenanceResult())
        await stopPromise
        expect(stopped).toBe(true)
        expect(logger.warn).not.toHaveBeenCalled()
    })

    it('raises a critical incident when payment reconciliation is partial', async () => {
        mocks.runMaintenanceCycle.mockResolvedValueOnce({
            ...createMaintenanceResult(),
            phaseFailures: [{ phase: 'payment_reconciliation', errorClass: 'dependency' }],
        })

        const logger = createLogger()
        const stop = startBackgroundJobs(logger, {} as Mailer)
        await new Promise<void>((resolve) => setImmediate(resolve))
        await stop()

        expect(mocks.recordSystemIncidentSafely).toHaveBeenCalledWith(expect.objectContaining({
            severity: 'critical',
            title: 'Background maintenance phases failed',
            metadata: {
                phaseFailures: [{ phase: 'payment_reconciliation', errorClass: 'dependency' }],
                hasPaymentFailure: true,
            },
        }))
        expect(logger.warn).toHaveBeenCalledWith(
            { phaseFailures: [{ phase: 'payment_reconciliation', errorClass: 'dependency' }] },
            'Background maintenance cycle completed partially',
        )
    })

    it('raises a critical incident when refund reconciliation is partial', async () => {
        mocks.runMaintenanceCycle.mockResolvedValueOnce({
            ...createMaintenanceResult(),
            phaseFailures: [{ phase: 'payment_refund_reconciliation', errorClass: 'dependency' }],
        })

        const logger = createLogger()
        const stop = startBackgroundJobs(logger, {} as Mailer)
        await new Promise<void>((resolve) => setImmediate(resolve))
        await stop()

        expect(mocks.recordSystemIncidentSafely).toHaveBeenCalledWith(expect.objectContaining({
            severity: 'critical',
            metadata: {
                phaseFailures: [{ phase: 'payment_refund_reconciliation', errorClass: 'dependency' }],
                hasPaymentFailure: true,
            },
        }))
    })

    it('raises a critical incident when invoice backfill is partial', async () => {
        mocks.runMaintenanceCycle.mockResolvedValueOnce({
            ...createMaintenanceResult(),
            phaseFailures: [{ phase: 'payment_invoice_backfill', errorClass: 'dependency' }],
        })

        const logger = createLogger()
        const stop = startBackgroundJobs(logger, {} as Mailer)
        await new Promise<void>((resolve) => setImmediate(resolve))
        await stop()

        expect(mocks.recordSystemIncidentSafely).toHaveBeenCalledWith(expect.objectContaining({
            severity: 'critical',
            metadata: {
                phaseFailures: [{ phase: 'payment_invoice_backfill', errorClass: 'dependency' }],
                hasPaymentFailure: true,
            },
        }))
    })

    it('redacts sensitive maintenance errors before structured logging', async () => {
        mocks.runMaintenanceCycle.mockImplementationOnce(() => new Promise((_, reject) => {
            setImmediate(() => reject(new Error(
                'provider failed with Bearer super-secret-token',
            )))
        }))

        const logger = createLogger()
        const stop = startBackgroundJobs(logger, {} as Mailer)
        await new Promise<void>((resolve) => setImmediate(resolve))
        await stop()

        expect(logger.error).toHaveBeenCalledWith(
            {
                error: {
                    name: 'Error',
                    message: '[REDACTED_ERROR_MESSAGE]',
                },
                errorClass: 'dependency',
            },
            'Background maintenance cycle failed',
        )
    })
})
