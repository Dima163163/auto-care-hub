import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AutoCareAppeal } from '@/entities/automotive-service'

import { AdminAutoCareAppealsPanel } from './AdminAutoCareAppealsPanel'

const mocks = vi.hoisted(() => ({ decide: vi.fn() }))

const appeal = {
    id: 'appeal-1',
    subject: 'provider',
    subjectId: 'provider-1',
    submittedById: 'owner-1',
    providerId: 'provider-1',
    reason: 'The provider profile decision needs another review.',
    evidenceIds: ['evidence-1'],
    status: 'pending',
    decidedById: null,
    decisionReason: null,
    createdAt: '2026-09-08T10:00:00.000Z',
    decidedAt: null,
} as AutoCareAppeal

vi.mock('@/entities/automotive-service', () => ({
    useGetAdminAutoCareAppealsQuery: () => ({ data: [appeal], isLoading: false, error: null, refetch: vi.fn() }),
    useDecideAdminAutoCareAppealMutation: () => [mocks.decide, { isLoading: false, error: null }],
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({
        locale: 'en',
        t: (key: string) => ({
            'adminAppeals.title': 'Appeals and decisions',
            'adminAppeals.description': 'Review appeals.',
            'adminAppeals.empty': 'No appeals match the selected filters.',
            'adminAppeals.reason': 'Appeal reason',
            'adminAppeals.evidence': 'Evidence items',
            'adminAppeals.accept': 'Accept',
            'adminAppeals.reject': 'Reject',
            'adminAppeals.decisionReason': 'Decision note',
            'adminAppeals.placeholder': 'Explain the decision in at least one sentence…',
            'adminAppeals.required': 'Add a note before making a decision.',
            'adminAppeals.failed': 'Could not load the appeal queue.',
            'adminAppeals.saved': 'Decision saved',
            'adminAppeals.failedDecision': 'Could not save the decision.',
            'adminAppeals.status': 'Status',
            'adminAppeals.subject': 'Subject',
            'adminAppeals.all': 'All',
            'adminAppeals.statusPending': 'Pending',
            'adminAppeals.statusAccepted': 'Accepted',
            'adminAppeals.statusRejected': 'Rejected',
            'adminAppeals.statusWithdrawn': 'Withdrawn',
            'adminAppeals.subjectProvider': 'Provider profile',
            'adminAppeals.subjectReview': 'Review',
            'adminAppeals.subjectSuspension': 'Suspension',
            'adminAppeals.subjectCatalog': 'Catalog',
            'adminAppeals.decided': 'Decision',
            'common.loading': 'Loading',
            'common.retry': 'Retry',
            'common.notProvided': 'Not provided',
        }[key] ?? key),
    }),
}))

describe('AdminAutoCareAppealsPanel', () => {
    beforeEach(() => {
        mocks.decide.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue(appeal) }))
    })

    it('requires a decision note and preserves the appeal decision payload', async () => {
        const user = userEvent.setup()
        render(<AdminAutoCareAppealsPanel />)

        expect(screen.getByRole('heading', { name: 'Appeals and decisions' })).toBeVisible()
        await user.click(screen.getByRole('button', { name: 'Accept' }))
        expect(screen.getByRole('alert')).toHaveTextContent('Add a note before making a decision.')
        expect(mocks.decide).not.toHaveBeenCalled()

        await user.type(screen.getByPlaceholderText('Explain the decision in at least one sentence…'), 'Accept after review')
        await user.click(screen.getByRole('button', { name: 'Accept' }))

        expect(mocks.decide).toHaveBeenCalledWith({ id: 'appeal-1', status: 'accepted', reason: 'Accept after review' })
    })
})
