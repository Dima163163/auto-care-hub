import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AutoCareProviderChangeRequest } from '@/entities/automotive-service'

import { AdminProviderChangeRequestsPanel } from './AdminProviderChangeRequestsPanel'

const mocks = vi.hoisted(() => ({ decide: vi.fn() }))

const request = {
    id: 'change-1',
    providerId: 'provider-1',
    requestedById: 'owner-1',
    kind: 'profile_update',
    status: 'pending',
    payload: { name: 'ProService' },
    reviewedById: null,
    reviewReason: null,
    reviewedAt: null,
    createdAt: '2026-09-08T10:00:00.000Z',
    updatedAt: '2026-09-08T10:00:00.000Z',
} as AutoCareProviderChangeRequest

vi.mock('@/entities/automotive-service', () => ({
    useGetAdminAutoCareProviderChangeRequestsQuery: () => ({ data: [request], isLoading: false, error: null, refetch: vi.fn() }),
    useDecideAdminAutoCareProviderChangeRequestMutation: () => [mocks.decide, { isLoading: false, error: null }],
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({
        locale: 'en',
        t: (key: string) => ({
            'adminProviderChangeRequests.title': 'Provider profile changes',
            'adminProviderChangeRequests.description': 'Review profile changes.',
            'adminProviderChangeRequests.empty': 'No profile changes require review.',
            'adminProviderChangeRequests.verification': 'Service verification',
            'adminProviderChangeRequests.profile': 'Profile update',
            'adminProviderChangeRequests.approve': 'Approve',
            'adminProviderChangeRequests.reject': 'Request clarification',
            'adminProviderChangeRequests.note': 'Note to owner',
            'adminProviderChangeRequests.placeholder': 'Briefly explain the decision…',
            'adminProviderChangeRequests.required': 'Add a note before deciding.',
            'adminProviderChangeRequests.failedDecision': 'Could not save the decision.',
            'adminProviderChangeRequests.failed': 'Could not load changes.',
            'common.loading': 'Loading',
            'common.retry': 'Retry',
        }[key] ?? key),
    }),
}))

describe('AdminProviderChangeRequestsPanel', () => {
    beforeEach(() => {
        mocks.decide.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue(request) }))
    })

    it('requires a note and preserves the localized decision payload', async () => {
        const user = userEvent.setup()
        render(<AdminProviderChangeRequestsPanel locale="en" />)

        expect(screen.getByRole('heading', { name: 'Provider profile changes' })).toBeVisible()
        await user.click(screen.getByRole('button', { name: 'Approve' }))
        expect(screen.getByRole('alert')).toHaveTextContent('Add a note before deciding.')
        expect(mocks.decide).not.toHaveBeenCalled()

        await user.type(screen.getByPlaceholderText('Briefly explain the decision…'), 'Approved profile data')
        await user.click(screen.getByRole('button', { name: 'Approve' }))

        expect(mocks.decide).toHaveBeenCalledWith({ id: 'change-1', status: 'approved', reason: 'Approved profile data' })
    })
})
