import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/shared/lib/i18n-provider'

import { AdminOperatorActionCenter } from './AdminOperatorActionCenter'

const mocks = vi.hoisted(() => ({
    role: 'super_admin' as 'super_admin' | 'admin',
    getSummary: vi.fn(),
    getIncidents: vi.fn(),
    getOutbox: vi.fn(),
}))

vi.mock('@/features/auth', () => ({
    useGetMeQuery: () => ({ data: { role: mocks.role } }),
}))

vi.mock('@/features/admin/api/adminApi', () => ({
    useGetSecurityCenterSummaryQuery: (...args: unknown[]) => {
        mocks.getSummary(...args)
        return {
            data: {
                openEvents: 7,
                criticalSeverityEvents: 2,
                blockedSignals: 4,
                highSeverityEvents: 5,
                recentEvents: [{
                    id: 'security-1',
                    type: 'route_scan',
                    severity: 'critical',
                    status: 'open',
                    assigneeId: null,
                    reasonCode: 'route_scan',
                    createdAt: '2026-08-11T10:00:00.000Z',
                    lastAction: null,
                    actionTimeline: [],
                }],
            },
            isLoading: false,
            isFetching: false,
            isError: false,
            refetch: vi.fn(),
        }
    },
    useGetSystemIncidentsPageQuery: (...args: unknown[]) => {
        mocks.getIncidents(...args)
        return {
            data: {
                items: [{
                    id: 'incident-1',
                    type: 'background_job',
                    severity: 'warning',
                    status: 'open',
                    title: 'Background job degraded',
                    requestId: null,
                    metadata: {},
                    occurrenceCount: 1,
                    firstOccurredAt: '2026-08-11T11:55:00.000Z',
                    lastOccurredAt: '2026-08-11T11:55:00.000Z',
                    acknowledgedAt: null,
                    resolvedAt: null,
                }],
                nextCursor: null,
            },
            isLoading: false,
            isFetching: false,
            isError: false,
            refetch: vi.fn(),
        }
    },
    useGetOutboxHealthQuery: (...args: unknown[]) => {
        mocks.getOutbox(...args)
        return {
            data: { deadLetterCount: 1, abandonedCount: 2 },
            isLoading: false,
            isFetching: false,
            isError: false,
            refetch: vi.fn(),
        }
    },
}))

function renderCenter() {
    return render(
        <MemoryRouter>
            <I18nProvider>
                <AdminOperatorActionCenter />
            </I18nProvider>
        </MemoryRouter>,
    )
}

describe('AdminOperatorActionCenter', () => {
    beforeEach(() => {
        mocks.role = 'super_admin'
        mocks.getSummary.mockClear()
        mocks.getIncidents.mockClear()
        mocks.getOutbox.mockClear()
    })

    it('shows bounded security and incident signals for a super admin', () => {
        renderCenter()

        expect(screen.getByRole('region', { name: 'Platform work requiring attention' })).toBeVisible()
        expect(screen.getByText('Open security events')).toBeVisible()
        expect(screen.getByText('Open incidents')).toBeVisible()
        expect(screen.getByText('Blocked signals')).toBeVisible()
        expect(screen.getByText('High-severity events')).toBeVisible()
        expect(screen.getByText('Outbox attention')).toBeVisible()
        expect(screen.getByText('3')).toBeVisible()
        expect(screen.getByRole('heading', { name: 'Prioritized action queue' })).toBeVisible()
        expect(screen.getAllByText('route_scan')).toHaveLength(2)
        expect(screen.getAllByRole('link', { name: /open related workspace/i })).toHaveLength(2)
        expect(screen.getAllByRole('link', { name: /open related workspace/i })[0]).toHaveAttribute('href', '/admin/security-center')
        expect(screen.getByRole('link', { name: /open security center/i })).toHaveAttribute('href', '/admin/security-center')
        expect(screen.getByRole('link', { name: /open audit and incidents/i })).toHaveAttribute('href', '/admin/audit-logs')
    })

    it('does not expose operator signals to an ordinary admin', () => {
        mocks.role = 'admin'

        renderCenter()

        expect(screen.queryByRole('region', { name: 'Platform work requiring attention' })).not.toBeInTheDocument()
        expect(mocks.getSummary).toHaveBeenCalledWith(1_440, expect.objectContaining({ skip: true }))
        expect(mocks.getIncidents).toHaveBeenCalledWith(
            { limit: 50, status: 'open' },
            expect.objectContaining({ skip: true }),
        )
        expect(mocks.getOutbox).toHaveBeenCalledWith(
            undefined,
            expect.objectContaining({ skip: true }),
        )
    })
})
