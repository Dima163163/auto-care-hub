import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getProviderProfile, type ProviderProfile, type ProviderReview } from '@/entities/automotive-service/model/autocareMockData'
import type { TranslationKey } from '@/shared/lib/i18n'
import { I18nContext } from '@/shared/lib/i18n-context'

import { ProviderReviews } from './ProviderReviews'

const mocks = vi.hoisted(() => ({
    currentUser: vi.fn(),
    myVotes: vi.fn(),
    vote: vi.fn(),
}))

vi.mock('@/entities/automotive-service', () => ({
    AutoCareCommunityBadgeList: () => null,
    automotiveServices: [{ id: 'oil-change', icon: 'wrench', labels: { en: 'Oil change' } }],
    getServiceLabel: (service: { labels: Record<string, string> }, locale: string) => service.labels[locale] ?? service.labels.en,
    useGetMyAutoCareHelpfulReviewIdsQuery: mocks.myVotes,
    useVoteAutoCareReviewHelpfulMutation: () => [mocks.vote, { isLoading: false }],
}))

vi.mock('@/features/auth', () => ({ useGetMeQuery: mocks.currentUser }))

const translations: Partial<Record<TranslationKey, string>> = {
    'autocare.providerAllRatings': 'All ratings',
    'autocare.providerAllServices': 'All services',
    'autocare.providerSortRecommended': 'Recommended',
    'autocare.providerSortByDate': 'Date',
    'autocare.providerReviews': 'Reviews',
    'autocare.providerNoReviews': 'No reviews',
    'autocare.providerNoReviewsDescription': 'No reviews yet.',
    'autocare.providerReviewPhoto': 'Review photo',
    'profile.community.anonymousAuthor': 'AutoCare client',
    'profile.community.visitVerified': 'Verified visit',
    'profile.community.helpful': 'Helpful',
    'profile.community.helpfulMarked': 'Marked helpful',
    'profile.community.ownReview': 'You cannot mark your own review as helpful',
    'profile.community.saveError': 'Could not save your vote.',
}

function makeReview(id: string, author: string): ProviderReview {
    return { id, author, rating: 5, date: '2026-09-25', text: 'The service explained the work clearly.', serviceId: 'oil-change', helpfulCount: 0 }
}

function renderReviews(reviews: ProviderReview[]) {
    const baseProvider = getProviderProfile('proservice-moscow')
    if (!baseProvider) throw new Error('Expected ProService fixture')
    const provider: ProviderProfile = { ...baseProvider, reviews, reviewCount: reviews.length, rating: 5 }

    return render(
        <I18nContext.Provider value={{
            locale: 'en',
            setLocale: vi.fn(),
            t: (key: TranslationKey) => translations[key] ?? key,
        }}>
            <MemoryRouter>
                <ProviderReviews provider={provider} state="success" onRetry={vi.fn()} />
            </MemoryRouter>
        </I18nContext.Provider>,
    )
}

describe('ProviderReviews client actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.currentUser.mockReturnValue({ data: { id: 'client-1', role: 'client', status: 'active', emailVerifiedAt: '2026-01-01T00:00:00.000Z' } })
        mocks.myVotes.mockReturnValue({ data: { reviewIds: [], ownReviewIds: [] }, isLoading: false })
        mocks.vote.mockReturnValue({ unwrap: vi.fn().mockResolvedValue(undefined) })
    })

    it('shows an explanatory disabled state for the signed-in client’s own review', () => {
        const ownReview = makeReview('review-own', 'Garage regular')
        mocks.myVotes.mockReturnValue({ data: { reviewIds: [], ownReviewIds: [ownReview.id] }, isLoading: false })
        renderReviews([ownReview])

        expect(screen.getByTitle('You cannot mark your own review as helpful')).toBeVisible()
        expect(screen.queryByRole('button', { name: /Helpful/ })).not.toBeInTheDocument()
    })

    it('lets the client mark another review as helpful', async () => {
        const user = userEvent.setup()
        const review = makeReview('review-peer', 'AutoCare client')
        const provider = getProviderProfile('proservice-moscow')
        if (!provider) throw new Error('Expected ProService fixture')
        mocks.myVotes.mockReturnValue({ data: { reviewIds: [], ownReviewIds: [] }, isLoading: false })
        renderReviews([review])

        await user.click(screen.getByRole('button', { name: /Helpful/ }))

        expect(mocks.vote).toHaveBeenCalledWith({ reviewId: review.id, providerId: provider.id, voted: true })
    })
})
