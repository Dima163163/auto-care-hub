import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AutoCareApiProvider } from '@/entities/automotive-service'

import { OwnerProviderMembersPanel } from './OwnerProviderMembersPanel'

const mocks = vi.hoisted(() => ({
    query: vi.fn(),
    invite: vi.fn(),
    revokeInvitation: vi.fn(),
    revokeMembership: vi.fn(),
}))

vi.mock('@/entities/automotive-service', () => ({
    useGetOwnerAutoCareProviderMembersQuery: (...args: unknown[]) => {
        mocks.query(...args)
        return {
            data: {
                memberships: [
                    { id: 'member-owner', providerId: 'provider-1', userId: 'owner-1', user: { id: 'owner-1', name: 'Sophia Miller', email: 'sophia@example.com', avatarUrl: null }, locationId: null, role: 'owner', status: 'active', createdAt: '2026-08-01T10:00:00.000Z' },
                    { id: 'member-staff', providerId: 'provider-1', userId: 'staff-1', user: { id: 'staff-1', name: 'Alex Staff', email: 'alex@example.com', avatarUrl: null }, locationId: 'location-1', role: 'staff', status: 'active', createdAt: '2026-08-02T10:00:00.000Z' },
                    { id: 'member-revoked', providerId: 'provider-1', userId: 'staff-2', user: { id: 'staff-2', name: 'Revoked Staff', email: 'revoked@example.com', avatarUrl: null }, locationId: 'location-1', role: 'staff', status: 'revoked', createdAt: '2026-08-03T10:00:00.000Z' },
                ],
                invitations: [{ id: 'invite-1', providerId: 'provider-1', email: 'new@example.com', locationId: 'location-1', role: 'manager', status: 'pending', expiresAt: '2026-09-01T10:00:00.000Z', acceptedAt: null, revokedAt: null, createdAt: '2026-08-04T10:00:00.000Z', inviteToken: null }],
            },
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        }
    },
    useInviteAutoCareProviderMemberMutation: () => [mocks.invite, { isLoading: false }],
    useRevokeAutoCareProviderInvitationMutation: () => [mocks.revokeInvitation, { isLoading: false }],
    useRevokeAutoCareProviderMembershipMutation: () => [mocks.revokeMembership, { isLoading: false }],
}))

const provider = { id: 'provider-1', location: { id: 'location-1' } } as AutoCareApiProvider

describe('OwnerProviderMembersPanel', () => {
    beforeEach(() => {
        mocks.query.mockClear()
        mocks.invite.mockClear()
        mocks.revokeInvitation.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue({}) }))
        mocks.revokeMembership.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue({}) }))
    })

    it('shows revoked access separately and revokes an active member with feedback', async () => {
        const user = userEvent.setup()
        render(<OwnerProviderMembersPanel provider={provider} locale="ru" />)

        expect(screen.getByText(/Revoked Staff/)).toBeVisible()
        expect(screen.getByText(/доступ отозван/i)).toBeVisible()

        await user.click(screen.getByRole('button', { name: /Отозвать: Alex Staff/ }))

        expect(mocks.revokeMembership).toHaveBeenCalledWith({ providerId: 'provider-1', membershipId: 'member-staff' })
        expect(await screen.findByRole('status')).toHaveTextContent('Доступ отозван')
        expect(screen.queryByRole('button', { name: /Отозвать: Revoked Staff/ })).not.toBeInTheDocument()
    })

    it('revokes a pending invitation in the selected provider scope', async () => {
        const user = userEvent.setup()
        render(<OwnerProviderMembersPanel provider={provider} locale="ru" />)

        await user.click(screen.getByRole('button', { name: /Отозвать: new@example.com/ }))

        expect(mocks.revokeInvitation).toHaveBeenCalledWith({ providerId: 'provider-1', invitationId: 'invite-1' })
        expect(await screen.findByRole('status')).toHaveTextContent('Доступ отозван')
    })

    it('surfaces revoke failures without hiding the team list', async () => {
        const user = userEvent.setup()
        mocks.revokeMembership.mockImplementation(() => ({ unwrap: vi.fn().mockRejectedValue({ data: { message: 'Access changed by another owner.' } }) }))
        render(<OwnerProviderMembersPanel provider={provider} locale="en" />)

        await user.click(screen.getByRole('button', { name: /Revoke: Alex Staff/ }))

        expect(await screen.findByRole('alert')).toHaveTextContent('Access changed by another owner.')
        expect(screen.getByText('Alex Staff')).toBeVisible()
    })
})
