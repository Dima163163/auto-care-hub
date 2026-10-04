

export type AutoCareOwnerWorkspaceAccess = {
    allowed: boolean
    providerIds: string[]
    scopes: Array<{ providerId: string; locationIds: string[] | null; roles: Array<'owner' | 'manager' | 'staff'> }>
}

export type AutoCareProviderMember = {
    id: string
    providerId: string
    userId: string
    user: { id: string; name: string; email: string; avatarUrl: string | null } | null
    locationId: string | null
    role: 'owner' | 'manager' | 'staff'
    status: 'active' | 'revoked'
    createdAt: string
}

export type AutoCareProviderInvitation = {
    id: string
    providerId: string
    email: string
    locationId: string | null
    role: 'manager' | 'staff'
    status: 'pending' | 'accepted' | 'revoked' | 'expired'
    expiresAt: string
    acceptedAt: string | null
    revokedAt: string | null
    createdAt: string
    inviteToken: string | null
}

export type AutoCareProviderMembersResponse = {
    memberships: AutoCareProviderMember[]
    invitations: AutoCareProviderInvitation[]
}

export type AutoCareProviderChangeRequest = {
    id: string
    providerId: string
    requestedById: string
    kind: 'verification' | 'profile_update'
    status: 'pending' | 'approved' | 'rejected' | 'cancelled'
    payload: Record<string, unknown>
    reviewedById: string | null
    reviewReason: string | null
    reviewedAt: string | null
    createdAt: string
    updatedAt: string
}

export type CreateAutoCareProviderChangeRequestInput = {
    providerId: string
    kind: AutoCareProviderChangeRequest['kind']
    payload?: Record<string, unknown>
}

export type DecideAutoCareProviderChangeRequestInput = {
    id: string
    status: 'approved' | 'rejected'
    reason?: string | null
}

export type CreateAutoCareProviderInvitationInput = { providerId: string; email: string; role: 'manager' | 'staff'; locationId?: string | null }

export type AcceptAutoCareProviderInvitationInput = { token: string }

export type AutoCareProviderInvitationAcceptResponse = {
    membership: AutoCareProviderMember
    invitation: AutoCareProviderInvitation
}
