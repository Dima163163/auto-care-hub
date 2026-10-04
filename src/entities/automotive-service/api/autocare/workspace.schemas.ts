import { z } from 'zod'
import type { AutoCareOwnerWorkspaceAccess, AutoCareProviderChangeRequest, AutoCareProviderInvitation, AutoCareProviderMembersResponse } from './workspace.types'

export const ownerWorkspaceAccessSchema = z.object({
    allowed: z.boolean(),
    providerIds: z.array(z.string()),
    scopes: z.array(z.object({
        providerId: z.string(),
        locationIds: z.array(z.string()).nullable(),
        roles: z.array(z.enum(['owner', 'manager', 'staff'])),
    })),
}) satisfies z.ZodType<AutoCareOwnerWorkspaceAccess>

export const autoCareProviderInvitationSchema = z.object({
    id: z.string(), providerId: z.string(), email: z.string().email(), locationId: z.string().nullable(),
    role: z.enum(['manager', 'staff']), status: z.enum(['pending', 'accepted', 'revoked', 'expired']),
    expiresAt: z.string().datetime({ offset: true }), acceptedAt: z.string().datetime({ offset: true }).nullable(),
    revokedAt: z.string().datetime({ offset: true }).nullable(), createdAt: z.string().datetime({ offset: true }),
    inviteToken: z.string().nullable(),
}).passthrough() satisfies z.ZodType<AutoCareProviderInvitation>

export const autoCareProviderMembersSchema = z.object({
    memberships: z.array(z.object({
        id: z.string(), providerId: z.string(), userId: z.string(), locationId: z.string().nullable(),
        user: z.object({ id: z.string(), name: z.string(), email: z.string().email(), avatarUrl: z.string().nullable() }).nullable(),
        role: z.enum(['owner', 'manager', 'staff']), status: z.enum(['active', 'revoked']), createdAt: z.string().datetime({ offset: true }),
    }).passthrough()),
    invitations: z.array(autoCareProviderInvitationSchema),
}).passthrough() satisfies z.ZodType<AutoCareProviderMembersResponse>

export const autoCareProviderChangeRequestSchema = z.object({
    id: z.string(),
    providerId: z.string(),
    requestedById: z.string(),
    kind: z.enum(['verification', 'profile_update']),
    status: z.enum(['pending', 'approved', 'rejected', 'cancelled']),
    payload: z.record(z.string(), z.unknown()),
    reviewedById: z.string().nullable(),
    reviewReason: z.string().nullable(),
    reviewedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
}).passthrough() satisfies z.ZodType<AutoCareProviderChangeRequest>
