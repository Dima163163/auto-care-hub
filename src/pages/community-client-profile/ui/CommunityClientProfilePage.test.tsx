import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommunityClientProfilePage } from './CommunityClientProfilePage'

const { query } = vi.hoisted(() => ({ query: { data: undefined as Record<string, string> | undefined, error: undefined as { status: number } | undefined, isError: false, isLoading: false, refetch: vi.fn() } }))
vi.mock('@/entities/automotive-service', () => ({ AutoCareCommunityBadgeList: () => null, useGetPublicAutoCareCommunityProfileQuery: () => query }))
vi.mock('@/shared/lib/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
function mount() { return render(<MemoryRouter initialEntries={['/community/clients/client-1']}><Routes><Route path="/community/clients/:profileId" element={<CommunityClientProfilePage />} /></Routes></MemoryRouter>) }
describe('public profile recovery', () => {
    beforeEach(() => { query.data = undefined; query.error = undefined; query.isError = false; query.isLoading = false; query.refetch.mockClear() })
    it.each([403, 404])('hides cached profile after %s and offers the public catalogue', (status) => {
        query.data = { displayName: 'Private cached name' }; query.error = { status }; query.isError = true
        mount()
        expect(screen.queryByText('Private cached name')).not.toBeInTheDocument()
        expect(screen.getByText('profile.community.profileUnavailable')).toBeVisible()
        expect(screen.getByRole('link', { name: 'info.openCatalog' })).toHaveAttribute('href', '/services')
        expect(screen.queryByRole('button', { name: 'common.retry' })).not.toBeInTheDocument()
    })
    it('offers retry for a temporary server error without claiming the profile is private', async () => {
        query.error = { status: 503 }; query.isError = true
        mount()
        expect(screen.queryByText('profile.community.profileUnavailable')).not.toBeInTheDocument()
        await userEvent.click(screen.getByRole('button', { name: 'common.retry' }))
        expect(query.refetch).toHaveBeenCalledOnce()
    })
    it('keeps loading distinct from unavailable and does not show premature recovery actions', () => {
        query.isLoading = true; mount()
        expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
        expect(screen.queryByRole('link')).not.toBeInTheDocument()
    })
})
