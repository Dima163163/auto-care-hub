import { http, HttpResponse } from "msw"
import { currentMockUser, getMockManagedProviderScopes, hasMockProviderRole, toMockMemberResponse } from './mock-access'
import { mockAutoCareProviderInvitations, mockAutoCareProviderMemberships, ownerAutoCareProviders } from './mock-fixtures'
import type { MockAutoCareProviderInvitation } from './mock-fixtures'
import { invalidMockBodyResponse } from './mock-validation'

export const workspaceHandlers = [
{ order: 136, handler: http.get('/api/owner/workspace-access', () => {
        const currentUser = currentMockUser()
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const scopes = currentUser.role === 'owner' ? getMockManagedProviderScopes(currentUser.id) : []
        return HttpResponse.json({ allowed: scopes.length > 0, providerIds: scopes.map((scope) => scope.providerId), scopes })
    }) },
{ order: 137, handler: http.get('/api/owner/autocare-providers/:providerId/members', ({ params }) => {
        const currentUser = currentMockUser()
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner' || !hasMockProviderRole(currentUser.id, String(params.providerId), ['owner'])) return HttpResponse.json({ message: 'Only provider owners can manage provider members.' }, { status: 403 })
        if (!ownerAutoCareProviders.some((provider) => provider.id === params.providerId)) return HttpResponse.json({ message: 'Automotive service not found.' }, { status: 404 })
        return HttpResponse.json({ memberships: (mockAutoCareProviderMemberships.get(String(params.providerId)) ?? []).map(toMockMemberResponse), invitations: mockAutoCareProviderInvitations.filter((invitation) => invitation.providerId === params.providerId) })
    }) },
{ order: 138, handler: http.post('/api/owner/autocare-providers/:providerId/members/invitations', async ({ params, request }) => {
        const currentUser = currentMockUser()
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner' || !hasMockProviderRole(currentUser.id, String(params.providerId), ['owner'])) return HttpResponse.json({ message: 'Only provider owners can invite provider members.' }, { status: 403 })
        const provider = ownerAutoCareProviders.find((candidate) => candidate.id === params.providerId)
        if (!provider) return HttpResponse.json({ message: 'Automotive service not found.' }, { status: 404 })
        const body = await request.json() as { email?: unknown; role?: unknown; locationId?: unknown }
        if (typeof body.email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email) || (body.role !== 'manager' && body.role !== 'staff') || (body.locationId !== undefined && body.locationId !== null && typeof body.locationId !== 'string')) return invalidMockBodyResponse()
        const email = body.email.trim().toLowerCase()
        const pending = mockAutoCareProviderInvitations.find((invitation) => invitation.providerId === provider.id && invitation.email === email && invitation.role === body.role && invitation.locationId === (body.locationId ?? null) && invitation.status === 'pending' && new Date(invitation.expiresAt) > new Date())
        if (pending) return HttpResponse.json({ message: 'A pending invitation already exists for this scope.' }, { status: 409 })
        const now = new Date().toISOString()
        const role = body.role === 'manager' ? 'manager' : 'staff'
        const invitation: MockAutoCareProviderInvitation = { id: `provider-invite-${Date.now()}`, providerId: provider.id, email, locationId: typeof body.locationId === 'string' ? body.locationId : null, role, status: 'pending', expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(), acceptedAt: null, revokedAt: null, createdAt: now, inviteToken: `mock-invite-${Date.now()}` }
        mockAutoCareProviderInvitations.unshift(invitation)
        return HttpResponse.json(invitation, { status: 201 })
    }) },
{ order: 139, handler: http.delete('/api/owner/autocare-providers/:providerId/members/invitations/:invitationId', ({ params }) => {
        const currentUser = currentMockUser()
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner' || !hasMockProviderRole(currentUser.id, String(params.providerId), ['owner'])) return HttpResponse.json({ message: 'Only provider owners can revoke provider invitations.' }, { status: 403 })
        const invitation = mockAutoCareProviderInvitations.find((candidate) => candidate.id === params.invitationId && candidate.providerId === params.providerId)
        if (!invitation) return HttpResponse.json({ message: 'Provider invitation not found.' }, { status: 404 })
        if (invitation.status === 'pending') { invitation.status = 'revoked'; invitation.revokedAt = new Date().toISOString() }
        return HttpResponse.json(invitation)
    }) },
{ order: 140, handler: http.delete('/api/owner/autocare-providers/:providerId/members/:membershipId', ({ params }) => {
        const currentUser = currentMockUser()
        if (!currentUser || currentUser.role !== 'owner' || !hasMockProviderRole(currentUser.id, String(params.providerId), ['owner'])) return HttpResponse.json({ message: 'Only provider owners can revoke provider memberships.' }, { status: 403 })
        const memberships = mockAutoCareProviderMemberships.get(String(params.providerId)) ?? []
        const membership = memberships.find((candidate) => candidate.id === String(params.membershipId))
        if (!membership) return HttpResponse.json({ message: 'Provider membership not found.' }, { status: 404 })
        membership.status = 'revoked'
        mockAutoCareProviderMemberships.set(String(params.providerId), memberships)
        return HttpResponse.json(toMockMemberResponse(membership))
    }) },
{ order: 141, handler: http.post('/api/owner/autocare-provider-invitations/accept', async ({ request }) => {
        const currentUser = currentMockUser()
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const body = await request.json() as { token?: unknown }
        if (typeof body.token !== 'string' || body.token.length < 8) return invalidMockBodyResponse()
        const invitation = mockAutoCareProviderInvitations.find((candidate) => candidate.inviteToken === body.token && candidate.status === 'pending')
        if (!invitation) return HttpResponse.json({ message: 'Provider invitation not found or no longer active.' }, { status: 404 })
        if (new Date(invitation.expiresAt) <= new Date()) { invitation.status = 'expired'; return HttpResponse.json({ message: 'Provider invitation has expired.' }, { status: 409 }) }
        if (currentUser.email.toLowerCase() !== invitation.email) return HttpResponse.json({ message: 'This invitation was issued for another email address.' }, { status: 403 })
        const memberships = mockAutoCareProviderMemberships.get(invitation.providerId) ?? []
        const membership = memberships.find((candidate) => candidate.userId === currentUser.id && candidate.locationId === invitation.locationId) ?? { id: `provider-membership-${Date.now()}`, providerId: invitation.providerId, userId: currentUser.id, locationId: invitation.locationId, role: invitation.role, status: 'active' as const, createdAt: new Date().toISOString() }
        if (!memberships.some((candidate) => candidate.id === membership.id)) memberships.push(membership)
        mockAutoCareProviderMemberships.set(invitation.providerId, memberships)
        invitation.status = 'accepted'; invitation.acceptedAt = new Date().toISOString(); invitation.inviteToken = null
        return HttpResponse.json({ membership: toMockMemberResponse(membership), invitation })
    }) }
]
