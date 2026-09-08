import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/shared/lib/i18n-provider'

import { SuperAdminOperationsRail } from './SuperAdminOperationsRail'

const mocks = vi.hoisted(() => ({
    role: 'super_admin' as 'super_admin' | 'admin',
    getOverview: vi.fn(),
}))

vi.mock('@/features/auth', () => ({
    useGetMeQuery: () => ({ data: { role: mocks.role } }),
}))

vi.mock('@/features/admin/api/adminApi', () => ({
    useGetAdminOperationsOverviewQuery: (...args: unknown[]) => {
        mocks.getOverview(...args)
        return {
            data: {
                generatedAt: '2026-09-08T10:00:00.000Z',
                overallStatus: 'healthy',
                database: {
                    status: 'connected',
                    latencyMs: 8,
                    schema: {
                        status: 'complete',
                        reasonCodes: [],
                        missingTables: [],
                        missingColumns: [],
                        missingIndexes: [],
                        missingConstraints: [],
                        missingMigrations: [],
                        aheadMigrations: [],
                    },
                    pool: {
                        status: 'ok',
                        total: 10,
                        idle: 8,
                        active: 2,
                        waiting: 0,
                        activeRatio: 0.2,
                        reasons: [],
                        thresholds: { maxActiveRatio: 0.85, maxWaitingRequests: 0 },
                    },
                },
                backend: {
                    signals: {
                        available: true,
                        openIncidents: 0,
                        criticalIncidents: 0,
                        openSecurityEvents: 0,
                        highSecurityEvents: 0,
                        criticalSecurityEvents: 0,
                        blockedSecuritySignals: 0,
                    },
                    redis: { status: 'disabled', latencyMs: 0 },
                    outbox: {
                        status: 'ok',
                        latencyMs: 4,
                        counts: { pending: 0, processing: 0, completed: 2, failed: 0, dead_letter: 0 },
                        activeCount: 0,
                        failedCount: 0,
                        abandonedCount: 0,
                        deadLetterCount: 0,
                        oldestAgeMs: null,
                        readiness: { ok: true, reasons: [], thresholds: { maxPending: 1000, maxDeadLetter: 0, maxOldestAgeMs: 900000 } },
                    },
                    storage: { provider: 'filesystem', antivirusMode: 'off' },
                    runtime: {
                        nodeEnv: 'test',
                        runtimeMode: 'local',
                        mailMode: 'logger',
                        redisEnabled: false,
                        metricsTokenConfigured: false,
                        databaseSslRejectUnauthorized: false,
                        deploymentMarket: 'ru',
                        attachmentStorageProvider: 'filesystem',
                        attachmentAntivirusMode: 'off',
                    },
                    metrics: { gauges: [], counters: [], histograms: [], seriesCount: 0 },
                },
            },
            isLoading: false,
            isError: false,
            refetch: vi.fn(),
        }
    },
}))

function renderRail() {
    return render(
        <MemoryRouter>
            <I18nProvider>
                <SuperAdminOperationsRail />
            </I18nProvider>
        </MemoryRouter>,
    )
}

describe('SuperAdminOperationsRail', () => {
    beforeEach(() => {
        mocks.role = 'super_admin'
        mocks.getOverview.mockClear()
    })

    it('keeps a compact operational status visible and expands details on demand', () => {
        renderRail()

        expect(screen.getByLabelText('System operations')).toBeVisible()
        expect(screen.getByText('Critical dependencies are healthy')).toBeVisible()
        expect(screen.queryByText('Connection pool')).not.toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Show details' }))

        expect(screen.getByText('Connection pool')).toBeVisible()
        expect(screen.getByText('Database')).toBeVisible()
    })

    it('does not render or request the snapshot for an ordinary admin', () => {
        mocks.role = 'admin'

        renderRail()

        expect(screen.queryByLabelText('System operations')).not.toBeInTheDocument()
        expect(mocks.getOverview).toHaveBeenCalledWith(undefined, expect.objectContaining({ skip: true }))
    })
})
