import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TranslationKey } from '@/shared/lib/i18n'
import { I18nContext } from '@/shared/lib/i18n-context'

import { CommunityProfileSettings } from './CommunityProfileSettings'

const mocks = vi.hoisted(() => ({
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    unwrap: vi.fn(),
}))

vi.mock('@/entities/automotive-service', () => ({
    AutoCareCommunityBadgeList: () => null,
    useGetMyAutoCareCommunityProfileQuery: mocks.getProfile,
    useUpdateMyAutoCareCommunityProfileMutation: () => [mocks.updateProfile, { isLoading: false }],
}))

const translations: Partial<Record<TranslationKey, string>> = {
    'profile.community.title': 'AutoCare community profile',
    'profile.community.description': 'The public profile is off until you enable it.',
    'profile.community.displayName': 'Public name',
    'profile.community.displayNamePlaceholder': 'Choose a public name',
    'profile.community.displayNameHint': 'Use a nickname; account details stay private.',
    'profile.community.shareLabel': 'Show my community profile publicly',
    'profile.community.shareDescription': 'Your chosen name and account avatar will appear on your published verified reviews and public profile, with your earned badges and aggregate counts.',
    'profile.community.privacyNote': 'Turning sharing off hides your public profile and removes your name and avatar from public reviews.',
    'profile.community.consentRequired': 'Review what will be visible before enabling.',
    'profile.community.metrics.confirmedVisits': 'Confirmed visits',
    'profile.community.metrics.publishedReviews': 'Verified reviews',
    'profile.community.metrics.helpfulVoters': 'People helped',
    'profile.community.badgesTitle': 'Your AutoCare badges',
    'profile.community.noBadges': 'Badges appear as you participate.',
    'profile.community.saved': 'Settings saved.',
    'profile.community.saveError': 'Could not save settings.',
    'profile.community.saveName': 'Save public name',
    'common.retry': 'Retry',
}

function renderSettings() {
    return render(
        <I18nContext.Provider value={{
            locale: 'en',
            setLocale: vi.fn(),
            t: (key: TranslationKey) => translations[key] ?? key,
        }}>
            <MemoryRouter>
                <CommunityProfileSettings />
            </MemoryRouter>
        </I18nContext.Provider>,
    )
}

describe('CommunityProfileSettings', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.getProfile.mockReturnValue({
            data: {
                enabled: false,
                displayName: null,
                publicProfileId: null,
                profileUrl: null,
                badgeCodes: [],
                metrics: { confirmedVisits: 0, publishedReviews: 0, helpfulVoters: 0 },
            },
            isLoading: false,
            isError: false,
            refetch: vi.fn(),
        })
        mocks.updateProfile.mockReturnValue({ unwrap: mocks.unwrap })
        mocks.unwrap.mockResolvedValue({ displayName: 'Garage regular' })
    })

    it('keeps public sharing disabled until the client supplies a public name and explicitly opts in', async () => {
        const user = userEvent.setup()
        renderSettings()

        const sharingSwitch = screen.getByRole('switch')
        expect(sharingSwitch).not.toBeChecked()
        expect(sharingSwitch).toBeDisabled()
        expect(screen.getByText('Your chosen name and account avatar will appear on your published verified reviews and public profile, with your earned badges and aggregate counts.')).toBeVisible()

        await user.type(screen.getByRole('textbox'), 'Garage regular')
        expect(sharingSwitch).toBeEnabled()
        await user.click(sharingSwitch)

        expect(mocks.updateProfile).toHaveBeenCalledWith({ enabled: true, displayName: 'Garage regular' })
    })
})
