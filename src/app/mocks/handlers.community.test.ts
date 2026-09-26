import { afterAll, afterEach, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'

import { handlers } from './handlers'
import { clearMockSession, setMockSession } from './session'

const server = setupServer(...handlers)
server.listen({ onUnhandledRequest: 'error' })
afterEach(() => clearMockSession())
afterAll(() => server.close())

describe('mock client community features', () => {
    it('requires opt-in, exposes only the chosen public identity, and hides the profile after revocation', async () => {
        setMockSession({ currentUserId: 'user-client-2', currentRole: 'client' })

        const privateResponse = await fetch('http://localhost:3000/api/users/me/community-profile')
        expect(privateResponse.status).toBe(200)
        const privateProfile = await privateResponse.json() as { enabled: boolean; displayName: string | null }
        expect(privateProfile.enabled).toBe(false)

        const enableResponse = await fetch('http://localhost:3000/api/users/me/community-profile', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ enabled: true, displayName: 'Мария Диагност' }),
        })
        expect(enableResponse.status).toBe(200)
        const enabledProfile = await enableResponse.json() as { publicProfileId: string; profileUrl: string | null }
        expect(enabledProfile.profileUrl).toBe(`/community/clients/${enabledProfile.publicProfileId}`)

        const publicResponse = await fetch(`http://localhost:3000/api/v1/community/clients/${enabledProfile.publicProfileId}`)
        expect(publicResponse.status).toBe(200)
        expect(publicResponse.headers.get('cache-control')).toBe('no-store')
        const publicProfile = await publicResponse.json() as Record<string, unknown>
        expect(publicProfile).toMatchObject({ displayName: 'Мария Диагност' })
        expect(publicProfile).not.toHaveProperty('email')
        expect(publicProfile).not.toHaveProperty('phone')
        expect(publicProfile).not.toHaveProperty('serviceHistory')

        const clearActiveNameResponse = await fetch('http://localhost:3000/api/users/me/community-profile', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ displayName: null }),
        })
        expect(clearActiveNameResponse.status).toBe(422)
        expect((await fetch(`http://localhost:3000/api/v1/community/clients/${enabledProfile.publicProfileId}`)).status).toBe(200)

        const revokeResponse = await fetch('http://localhost:3000/api/users/me/community-profile', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ enabled: false }),
        })
        expect(revokeResponse.status).toBe(200)
        const hiddenResponse = await fetch(`http://localhost:3000/api/v1/community/clients/${enabledProfile.publicProfileId}`)
        expect(hiddenResponse.status).toBe(404)

        await fetch('http://localhost:3000/api/users/me/community-profile', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ displayName: 'Мария Сервис' }),
        })
    })

    it('blocks self-votes and keeps a client’s helpful vote idempotent and removable', async () => {
        setMockSession({ currentUserId: 'user-client-1', currentRole: 'client' })

        const ownVotesResponse = await fetch('http://localhost:3000/api/v1/autocare-reviews/helpful/my?providerId=api-proservice-moscow')
        expect(ownVotesResponse.status).toBe(200)
        const ownVotes = await ownVotesResponse.json() as { reviewIds: string[]; ownReviewIds: string[] }
        expect(ownVotes.ownReviewIds).toContain('featured-review-1')

        const selfVote = await fetch('http://localhost:3000/api/v1/autocare-reviews/featured-review-1/helpful', { method: 'PUT' })
        expect(selfVote.status).toBe(403)

        const voteUrl = 'http://localhost:3000/api/v1/autocare-reviews/community-review-client-2/helpful'
        const firstVote = await fetch(voteUrl, { method: 'PUT' })
        const duplicateVote = await fetch(voteUrl, { method: 'PUT' })
        expect(firstVote.status).toBe(200)
        expect(duplicateVote.status).toBe(200)
        expect(await duplicateVote.json()).toMatchObject({ helpfulCount: 1, voted: true })

        const updatedVotesResponse = await fetch('http://localhost:3000/api/v1/autocare-reviews/helpful/my?providerId=api-proservice-moscow')
        expect(await updatedVotesResponse.json()).toMatchObject({ reviewIds: ['community-review-client-2'] })

        const removeVote = await fetch(voteUrl, { method: 'DELETE' })
        expect(await removeVote.json()).toMatchObject({ helpfulCount: 0, voted: false })
    })
})
