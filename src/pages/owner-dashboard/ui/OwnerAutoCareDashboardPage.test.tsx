import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AutoCareApiProvider, AutoCareOwnerWorkspaceAccess, AutoCareServiceRequest } from '@/entities/automotive-service'
import type { UserRole } from '@/entities/user'
import { OwnerAutoCareDashboardPage } from './OwnerAutoCareDashboardPage'

const state = vi.hoisted(() => ({
    role: 'owner' as UserRole,
    providers: [] as AutoCareApiProvider[],
    requests: [] as AutoCareServiceRequest[],
    scopes: [] as AutoCareOwnerWorkspaceAccess['scopes'],
    analytics: vi.fn((_id: string, _options: { skip: boolean }) => ({ data: undefined, isLoading: false, isError: false, refetch: vi.fn() })),
    publicProfile: vi.fn((_id: string, _options: { skip: boolean }) => ({ data: undefined, isError: false, isLoading: false })),
}))
vi.mock('@/features/auth', () => ({ useGetMeQuery: () => ({ data: { role: state.role, name: 'Ilya' } }) }))
vi.mock('@/entities/automotive-service', () => ({
    useGetOwnerAutoCareProvidersQuery: () => ({ data: state.providers, isLoading: false, error: null, refetch: vi.fn() }),
    useGetOwnerAutoCareServiceRequestsQuery: () => ({ data: state.requests, isLoading: false, error: null, refetch: vi.fn() }),
    useGetOwnerAutoCareWorkspaceAccessQuery: () => ({ data: { allowed: true, scopes: state.scopes }, isLoading: false, error: null, refetch: vi.fn() }),
    useGetOwnerAutoCareProviderAnalyticsQuery: (id: string, options: { skip: boolean }) => state.analytics(id, options),
    useGetAutoCareProviderProfileQuery: (id: string, options: { skip: boolean }) => state.publicProfile(id, options),
}))
vi.mock('@/shared/lib/useTranslation', () => ({ useTranslation: () => ({ locale: 'ru', t: (key: string) => key }) }))
vi.mock('./OwnerAutoCareBranchPanel', () => ({ OwnerAutoCareBranchPanel: ({ title }: { title: string }) => <h2>{title}</h2> }))
vi.mock('./OwnerAutoCareRequestQueue', () => ({ OwnerAutoCareRequestQueue: () => <h2>Accessible requests</h2> }))
vi.mock('./OwnerAutoCareAnalyticsCard', () => ({ OwnerAutoCareAnalyticsCard: () => <h2>Analytics</h2> }))
vi.mock('./OwnerAutoCareQuickActions', () => ({ OwnerAutoCareQuickActions: () => null }))
vi.mock('./OwnerBroadcastRequestsPanel', () => ({ OwnerBroadcastRequestsPanel: () => null }))
vi.mock('./OwnerFleetPanel', () => ({ OwnerFleetPanel: () => null }))

function request(locationId: string, address: string): AutoCareServiceRequest {
    return { id: `request-${locationId}`, providerId: 'provider-1', providerName: 'ProService', locationId, address, definitionId: 'oil', serviceSlug: 'oil-change', serviceLabels: { ru: 'Замена масла' }, serviceDescription: null, offeringId: null, priceFromMinor: null, currencyCode: 'RUB', preferredAt: null, vehicleSnapshot: null, contactSnapshot: null, note: null, status: 'open', clientConfirmedAt: null, providerConfirmedAt: null, reschedule: null, createdAt: '2026-10-01T10:00:00Z', updatedAt: '2026-10-01T10:00:00Z', quote: null, quoteHistory: [] }
}
function mount() { return render(<MemoryRouter><OwnerAutoCareDashboardPage /></MemoryRouter>) }
describe('assigned provider dashboard', () => {
    beforeEach(() => {
        state.role = 'owner'; state.providers = []; state.requests = [request('branch-1', 'Assigned address'), request('branch-2', 'Other address')]
        state.scopes = [{ providerId: 'provider-1', locationIds: ['branch-1'], roles: ['staff'] }]
        state.analytics.mockClear(); state.publicProfile.mockClear()
    })
    it('shows staff context separately while preserving global owner profile capabilities', () => {
        mount()
        const assigned = screen.getByRole('heading', { name: 'autocare.assignedProvidersTitle' }).closest('section')!
        expect(within(assigned).getByText('ProService')).toBeVisible()
        expect(within(assigned).getByText('Assigned address')).toBeVisible()
        expect(within(assigned).queryByText('Other address')).not.toBeInTheDocument()
        expect(assigned).toHaveTextContent('autocare.ownerInvitationRoleStaff')
        expect(within(assigned).getByRole('link')).toHaveAttribute('href', '/owner/autocare-requests?provider=provider-1')
        expect(screen.getByRole('link', { name: 'autocare.ownerDashboardHeroProfile' })).toBeVisible()
        expect(screen.getByRole('heading', { name: 'autocare.ownedProvidersTitle' })).toBeVisible()
        expect(state.analytics).toHaveBeenCalledWith('', { skip: true })
        expect(screen.queryByText('autocare.ownerMetricsRating')).not.toBeInTheDocument()
    })
    it('does not grant global provider creation to a client with a staff assignment', () => {
        state.role = 'client'; mount()
        expect(screen.queryByRole('link', { name: 'autocare.ownerDashboardHeroProfile' })).not.toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'autocare.assignedProvidersTitle' })).toBeVisible()
    })
    it('keeps assigned work accessible when no public profile or request metadata is available', () => {
        state.requests = []; mount()
        expect(screen.getByText('autocare.assignedProviderFallback')).toBeVisible()
        expect(screen.getByText('autocare.assignedBranchUnavailable')).toBeVisible()
        expect(state.publicProfile).toHaveBeenCalledWith('provider-1', { skip: false })
        expect(screen.getAllByRole('link', { name: 'autocare.ownerDashboardHeroRequests' })).toHaveLength(2)
    })
})
