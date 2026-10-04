import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProfilePrivacy } from './ProfilePrivacy'

const state = vi.hoisted(() => ({ analytics: false, marketing: false, update: vi.fn(), deletion: vi.fn() }))
vi.mock('@/shared/lib/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@/entities/user', () => ({
    useCancelAccountDeletionMutation: () => [vi.fn(), { isLoading: false }],
    useGetAccountDeletionRequestQuery: () => ({ data: null, isLoading: false }),
    useGetMyConsentsQuery: () => ({ data: { consents: { analytics: { granted: state.analytics }, marketing: { granted: state.marketing } } }, isLoading: false }),
    useLazyExportMyDataQuery: () => [vi.fn(), { isFetching: false }],
    useRequestAccountDeletionMutation: () => [state.deletion, { isLoading: false }],
    useUpdateMyConsentsMutation: () => [state.update, { isLoading: false }],
}))
function mount() { return render(<MemoryRouter><ProfilePrivacy /></MemoryRouter>) }
describe('privacy channel availability', () => {
    beforeEach(() => {
        state.analytics = false; state.marketing = false
        state.update.mockReset().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) })
        state.deletion.mockReset().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) })
    })
    it('does not allow granting consent to unavailable channels', () => {
        mount()
        const choices = screen.getAllByRole('checkbox')
        expect(choices).toHaveLength(2)
        for (const choice of choices) { expect(choice).toBeDisabled(); expect(choice).not.toBeChecked() }
        expect(state.update).not.toHaveBeenCalled()
    })
    it('allows withdrawal of a consent granted previously', async () => {
        state.analytics = true; mount()
        const choice = screen.getAllByRole('checkbox')[0]!
        expect(choice).toBeEnabled(); expect(choice).toBeChecked()
        await userEvent.click(choice)
        expect(state.update).toHaveBeenCalledWith({ analytics: false })
    })
    it('opening the separated deletion area does not submit a deletion request', async () => {
        mount()
        await userEvent.click(screen.getByRole('button', { name: 'profile.privacy.requestAction' }))
        expect(screen.getByRole('textbox', { name: 'profile.privacy.reasonLabel' })).toBeVisible()
        expect(state.deletion).not.toHaveBeenCalled()
        await userEvent.click(screen.getByRole('button', { name: 'profile.privacy.confirmRequest' }))
        expect(state.deletion).toHaveBeenCalledOnce()
    })
})
