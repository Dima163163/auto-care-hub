import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { I18nContext } from '@/shared/lib/i18n-context'

import { SystemIncidentsPanel } from './SystemIncidentsPanel'

const mocks = vi.hoisted(() => ({
    query: vi.fn(),
    updateStatus: vi.fn(),
    unwrap: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
}))

vi.mock('sonner', () => ({
    toast: {
        success: mocks.toastSuccess,
        error: mocks.toastError,
    },
}))

vi.mock('@/features/admin/api/adminApi', () => ({
    useGetSystemIncidentsPageQuery: () => mocks.query(),
    useLazyGetSystemIncidentsPageQuery: () => [vi.fn(), { isFetching: false }],
    useUpdateSystemIncidentStatusMutation: () => [
        mocks.updateStatus,
        { isLoading: false },
    ],
}))

const translations: Record<string, string> = {
    'common.actions': 'Actions',
    'common.failedToLoad': 'Failed to load.',
    'common.loading': 'Loading...',
    'common.retry': 'Retry',
    'common.status': 'Status',
    'common.tryAgainLater': 'Please try again later.',
    'systemIncidents.acknowledge': 'Acknowledge',
    'systemIncidents.copyFailed': 'Could not copy request ID.',
    'systemIncidents.copyRequestId': 'Copy request ID',
    'systemIncidents.copied': 'Request ID copied',
    'systemIncidents.description': 'Operational events',
    'systemIncidents.emptyDescription': 'No incidents',
    'systemIncidents.emptyTitle': 'No active incidents',
    'systemIncidents.firstSeen': 'First seen',
    'systemIncidents.incident': 'Incident',
    'systemIncidents.lastSeen': 'Last seen',
    'systemIncidents.metadata': 'Metadata',
    'systemIncidents.occurrences': 'Occurrences',
    'systemIncidents.requestId': 'Request ID',
    'systemIncidents.resolve': 'Resolve',
    'systemIncidents.severity': 'Severity',
    'systemIncidents.severityCritical': 'Critical',
    'systemIncidents.severityWarning': 'Warning',
    'systemIncidents.showMetadata': 'View metadata',
    'systemIncidents.searchPlaceholder': 'Search incidents...',
    'systemIncidents.statusFilter': 'Status',
    'systemIncidents.allStatuses': 'All',
    'systemIncidents.acknowledgedAt': 'Acknowledged',
    'systemIncidents.resolvedAt': 'Resolved',
    'systemIncidents.loadedCount': '{count} incidents loaded',
    'systemIncidents.loadMore': 'Load more',
    'systemIncidents.loadingMore': 'Loading more...',
    'systemIncidents.statusAcknowledged': 'Acknowledged',
    'systemIncidents.statusOpen': 'Open',
    'systemIncidents.statusResolved': 'Resolved',
    'systemIncidents.title': 'System incidents',
}

function renderPanel() {
    return render(
        <I18nContext.Provider
            value={{
                locale: 'en',
                setLocale: vi.fn(),
                t: (key) => translations[key] ?? key,
            }}
        >
            <SystemIncidentsPanel />
        </I18nContext.Provider>,
    )
}

describe('SystemIncidentsPanel', () => {
    it('shows a server incident and acknowledges it', async () => {
        const user = userEvent.setup()
        mocks.unwrap.mockResolvedValue(undefined)
        mocks.updateStatus.mockReturnValue({ unwrap: mocks.unwrap })
        mocks.query.mockReturnValue({
            data: {
                items: [{
                    id: 'incident-1',
                    type: 'server_error',
                    severity: 'critical',
                    status: 'open',
                    title: 'Unhandled server error on /bookings',
                    requestId: 'request-123',
                    metadata: {},
                    occurrenceCount: 2,
                    firstOccurredAt: '2026-07-16T08:00:00.000Z',
                    lastOccurredAt: '2026-07-16T08:10:00.000Z',
                    acknowledgedAt: null,
                    resolvedAt: null,
                }],
                nextCursor: null,
            },
            isError: false,
            isLoading: false,
        })

        renderPanel()

        expect(screen.getByText('Unhandled server error on /bookings')).toBeVisible()
        expect(screen.getByText('request-123')).toBeVisible()
        expect(screen.getByText('Metadata')).toBeVisible()

        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText: vi.fn().mockResolvedValue(undefined) },
        })
        await user.click(screen.getByRole('button', { name: 'Copy request ID' }))
        expect(mocks.toastSuccess).toHaveBeenCalledWith('Request ID copied')

        await user.click(screen.getByRole('button', { name: 'Acknowledge' }))

        expect(mocks.updateStatus).toHaveBeenCalledWith({
            id: 'incident-1',
            status: 'acknowledged',
        })
    })

    it('shows a recovery state when incidents cannot be loaded', () => {
        mocks.query.mockReturnValue({
            data: { items: [], nextCursor: null },
            error: { status: 'FETCH_ERROR' },
            isError: true,
            isLoading: false,
        })

        renderPanel()

        expect(screen.getByText('Failed to load.')).toBeVisible()
        expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible()
    })

    it('surfaces a status update failure to the operator', async () => {
        const user = userEvent.setup()
        mocks.unwrap.mockRejectedValueOnce({ status: 503 })
        mocks.updateStatus.mockReturnValue({ unwrap: mocks.unwrap })
        mocks.query.mockReturnValue({
            data: {
                items: [{
                    id: 'incident-2',
                    type: 'server_error',
                    severity: 'warning',
                    status: 'open',
                    title: 'Background worker unavailable',
                    requestId: null,
                    metadata: {},
                    occurrenceCount: 1,
                    firstOccurredAt: '2026-07-16T08:00:00.000Z',
                    lastOccurredAt: '2026-07-16T08:00:00.000Z',
                    acknowledgedAt: null,
                    resolvedAt: null,
                }],
                nextCursor: null,
            },
            isError: false,
            isLoading: false,
        })

        renderPanel()
        await user.click(screen.getByRole('button', { name: 'Acknowledge' }))

        expect(mocks.toastError).toHaveBeenCalledWith('Please try again later.')
    })
})
