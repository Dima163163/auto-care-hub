import { assertSecurityTokenInput } from '../auth/security-token-value.js'
import { AutomotiveProviderInvitationRole } from '../../entities/automotive/provider-invitation.entity.js'
import { normalizeEmailAddress } from '../../shared/mail/email-address-policy.js'

const invitationRoles = new Set<AutomotiveProviderInvitationRole>(Object.values(AutomotiveProviderInvitationRole))
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function normalizeProviderMembershipUuid(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.trim().toLowerCase()
    return uuidPattern.test(normalized) ? normalized : null
}

export function normalizeProviderInvitationInput(input: unknown): { email: string; role: AutomotiveProviderInvitationRole; locationId: string | null } | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (Object.keys(value).some((key) => !['email', 'role', 'locationId'].includes(key))) return null
    if (typeof value.email !== 'string' || typeof value.role !== 'string') return null
    const role = value.role.normalize('NFKC').trim().toLowerCase()
    if (!invitationRoles.has(role as AutomotiveProviderInvitationRole)) return null
    const locationId = value.locationId === undefined || value.locationId === null ? null : normalizeProviderMembershipUuid(value.locationId)
    if (value.locationId !== undefined && value.locationId !== null && !locationId) return null
    try {
        return {
            email: normalizeEmailAddress(value.email.normalize('NFKC')),
            role: role as AutomotiveProviderInvitationRole,
            locationId,
        }
    } catch {
        return null
    }
}

export function normalizeProviderInvitationToken(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const token = value.trim()
    try {
        return assertSecurityTokenInput(token)
    } catch {
        return null
    }
}
