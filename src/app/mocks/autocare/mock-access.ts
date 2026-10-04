import type { User } from "@/entities/user"
import { mockUsers } from ".././data"
import { mockSession } from ".././session"
import { mockAutoCareProviderMemberships, mockAutoCareServiceRequests, mockCommunityConsentLedger, mockFeaturedAutoCareReviews, mockLegalDocumentVersions, mockOAuthIdentitiesByUser, mockOptionalConsents, mockProviderWorkspacePermissions } from './mock-fixtures'
import type { MockAutoCareProviderMembership, MockManagedProviderAssignment } from './mock-fixtures'

export function hasMockSuperAdminAccess() {
    return currentMockUser()?.role === 'super_admin'
}

export function currentMockUser() {
    return mockUsers.find((user) => user.id === mockSession.currentUserId)
}

export function getMockUserConsentState(userId: string) {
    const emptyOptionalConsent = { granted: false, version: null, recordedAt: null }
    const optional = mockOptionalConsents.get(userId) ?? {
        analytics: { ...emptyOptionalConsent },
        marketing: { ...emptyOptionalConsent },
    }
    const communityRecord = [...mockCommunityConsentLedger].reverse().find((record) => record.userId === userId)
    const communityProfile = communityRecord
        ? { granted: communityRecord.action === 'granted', version: mockLegalDocumentVersions.privacy, recordedAt: communityRecord.at }
        : { ...emptyOptionalConsent }
    const acceptedAt = mockUsers.find((user) => user.id === userId)?.createdAt ?? null
    const requiredConsent = { granted: true, version: mockLegalDocumentVersions.terms, recordedAt: acceptedAt }

    return {
        versions: mockLegalDocumentVersions,
        consents: {
            terms: requiredConsent,
            privacy: { ...requiredConsent, version: mockLegalDocumentVersions.privacy },
            analytics: optional.analytics,
            marketing: optional.marketing,
            communityProfile,
        },
    }
}

export function getMockManagedProviderAssignments(userId: string): MockManagedProviderAssignment[] {
    return [...mockAutoCareProviderMemberships.values()].flatMap((memberships) => memberships
        .filter((membership) => membership.userId === userId && membership.status === 'active')
        .map(({ providerId, locationId, role }) => ({ providerId, locationId, role })))
}

export function getMockManagedProviderScopes(userId: string) {
    const scopes = new Map<string, { locations: Set<string> | null; roles: Set<MockAutoCareProviderMembership['role']> }>()
    for (const assignment of getMockManagedProviderAssignments(userId)) {
        const scope = scopes.get(assignment.providerId) ?? { locations: new Set<string>(), roles: new Set<MockAutoCareProviderMembership['role']>() }
        scope.roles.add(assignment.role)
        if (assignment.locationId === null) scope.locations = null
        else if (scope.locations !== null) scope.locations.add(assignment.locationId)
        scopes.set(assignment.providerId, scope)
    }
    return [...scopes.entries()].map(([providerId, scope]) => ({
        providerId,
        locationIds: scope.locations === null ? null : [...scope.locations],
        roles: [...scope.roles],
    }))
}

export function hasMockProviderRole(userId: string, providerId: string, allowedRoles: readonly MockAutoCareProviderMembership['role'][], locationId?: string | null) {
    return getMockManagedProviderAssignments(userId).some((assignment) => assignment.providerId === providerId
        && allowedRoles.includes(assignment.role)
        && (locationId === undefined
            || (locationId === null ? assignment.locationId === null : assignment.locationId === null || assignment.locationId === locationId)))
}

export function hasMockProviderPermission(userId: string, providerId: string, permission: string, locationId?: string | null) {
    return getMockManagedProviderAssignments(userId).some((assignment) => assignment.providerId === providerId
        && mockProviderWorkspacePermissions[assignment.role].includes(permission)
        && (locationId === undefined
            || (locationId === null ? assignment.locationId === null : assignment.locationId === null || assignment.locationId === locationId)))
}

/**
 * Applies the same branch-aware role semantics to aggregate owner views as
 * the real API.  A manager/staff assignment is never widened by another
 * assignment on a different branch; provider-wide assignments remain broad.
 */
export function hasMockProviderRoleAtLocation(userId: string, providerId: string, allowedRoles: readonly MockAutoCareProviderMembership['role'][], locationId: string) {
    return getMockManagedProviderAssignments(userId).some((assignment) => assignment.providerId === providerId
        && allowedRoles.includes(assignment.role)
        && (assignment.locationId === null || assignment.locationId === locationId))
}

export function getMockScopedProviderReviews(userId: string, providerId: string, allowedRoles: readonly MockAutoCareProviderMembership['role'][]) {
    const requestsById = new Map(mockAutoCareServiceRequests.filter((request) => request.providerId === providerId).map((request) => [request.id, request]))
    return mockFeaturedAutoCareReviews.filter((review) => {
        if (review.providerId !== providerId || (review.status ?? 'approved') !== 'approved') return false
        const request = review.serviceRequestId ? requestsById.get(review.serviceRequestId) : null
        // Provider-wide roles can also see reviews not tied to a request. A
        // branch-scoped role must have an explicit request/location link.
        return request
            ? hasMockProviderRoleAtLocation(userId, providerId, allowedRoles, request.locationId)
            : getMockManagedProviderAssignments(userId).some((assignment) => assignment.providerId === providerId && assignment.locationId === null && allowedRoles.includes(assignment.role))
    })
}

export function toMockMemberResponse(membership: MockAutoCareProviderMembership) {
    const user = mockUsers.find((candidate) => candidate.id === membership.userId)
    return {
        ...membership,
        user: user ? {
            id: user.id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
        } : null,
    }
}

export function getMockOAuthIdentities(user: User) {
    const existing = mockOAuthIdentitiesByUser.get(user.id)

    if (existing) {
        return existing
    }

    const identities = new Set<'google' | 'yandex'>()

    if (user.provider === 'google' || user.provider === 'yandex') {
        identities.add(user.provider)
    }

    mockOAuthIdentitiesByUser.set(user.id, identities)

    return identities
}
