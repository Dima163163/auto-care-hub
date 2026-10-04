import { z } from 'zod'
import { autoCareProviderChangeRequestSchema, autoCareProviderInvitationSchema, autoCareProviderMembersSchema, ownerWorkspaceAccessSchema } from './workspace.schemas'
import type { AcceptAutoCareProviderInvitationInput, AutoCareOwnerWorkspaceAccess, AutoCareProviderChangeRequest, AutoCareProviderInvitation, AutoCareProviderInvitationAcceptResponse, AutoCareProviderMember, AutoCareProviderMembersResponse, CreateAutoCareProviderChangeRequestInput, CreateAutoCareProviderInvitationInput, DecideAutoCareProviderChangeRequestInput } from './workspace.types'
import type { AutoCareEndpointBuilder } from './endpoint-builder'

export function createWorkspaceEndpoints(build: AutoCareEndpointBuilder) {
    return {
getOwnerAutoCareWorkspaceAccess: build.query<AutoCareOwnerWorkspaceAccess, void>({
            query: () => '/owner/workspace-access',
            transformResponse: (value: unknown) => ownerWorkspaceAccessSchema.parse(value),
            providesTags: [{ type: 'AutoCareProvider', id: 'WORKSPACE_ACCESS' }],
        }),
getOwnerAutoCareProviderMembers: build.query<AutoCareProviderMembersResponse, string>({
            query: (providerId) => `/owner/autocare-providers/${encodeURIComponent(providerId)}/members`,
            transformResponse: (value: unknown) => autoCareProviderMembersSchema.parse(value),
            providesTags: (_result, _error, providerId) => [{ type: 'AutoCareProvider', id: `MEMBERS_${providerId}` }],
        }),
inviteAutoCareProviderMember: build.mutation<AutoCareProviderInvitation, CreateAutoCareProviderInvitationInput>({
            query: ({ providerId, ...body }) => ({ url: `/owner/autocare-providers/${encodeURIComponent(providerId)}/members/invitations`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareProviderInvitationSchema.parse(value),
            invalidatesTags: (_result, _error, { providerId }) => [{ type: 'AutoCareProvider', id: `MEMBERS_${providerId}` }],
        }),
revokeAutoCareProviderInvitation: build.mutation<AutoCareProviderInvitation, { providerId: string; invitationId: string }>({
            query: ({ providerId, invitationId }) => ({ url: `/owner/autocare-providers/${encodeURIComponent(providerId)}/members/invitations/${encodeURIComponent(invitationId)}`, method: 'DELETE' }),
            transformResponse: (value: unknown) => autoCareProviderInvitationSchema.parse(value),
            invalidatesTags: (_result, _error, { providerId }) => [{ type: 'AutoCareProvider', id: `MEMBERS_${providerId}` }],
        }),
revokeAutoCareProviderMembership: build.mutation<AutoCareProviderMember, { providerId: string; membershipId: string }>({
            query: ({ providerId, membershipId }) => ({ url: `/owner/autocare-providers/${encodeURIComponent(providerId)}/members/${encodeURIComponent(membershipId)}`, method: 'DELETE' }),
            transformResponse: (value: unknown) => autoCareProviderMembersSchema.shape.memberships.element.parse(value),
            invalidatesTags: (_result, _error, { providerId }) => [{ type: 'AutoCareProvider', id: `MEMBERS_${providerId}` }],
        }),
acceptAutoCareProviderInvitation: build.mutation<AutoCareProviderInvitationAcceptResponse, AcceptAutoCareProviderInvitationInput>({
            query: (body) => ({ url: '/owner/autocare-provider-invitations/accept', method: 'POST', body }),
            transformResponse: (value: unknown) => z.object({
                membership: z.object({ id: z.string(), providerId: z.string(), userId: z.string(), user: z.object({ id: z.string(), name: z.string(), email: z.string().email(), avatarUrl: z.string().nullable() }).nullable(), locationId: z.string().nullable(), role: z.enum(['owner', 'manager', 'staff']), status: z.enum(['active', 'revoked']), createdAt: z.string().datetime({ offset: true }) }).passthrough(),
                invitation: autoCareProviderInvitationSchema,
            }).parse(value),
            invalidatesTags: [
                { type: 'AutoCareProvider', id: 'OWNER_LIST' },
                { type: 'AutoCareProvider', id: 'WORKSPACE_ACCESS' },
            ],
        }),
getOwnerAutoCareProviderChangeRequests: build.query<AutoCareProviderChangeRequest[], string>({
            query: (providerId) => `/owner/autocare-providers/${encodeURIComponent(providerId)}/change-requests`,
            transformResponse: (value: unknown) => z.array(autoCareProviderChangeRequestSchema).parse(value),
            providesTags: (_result, _error, providerId) => [{ type: 'AutoCareProvider', id: `CHANGES_${providerId}` }],
        }),
createOwnerAutoCareProviderChangeRequest: build.mutation<AutoCareProviderChangeRequest, CreateAutoCareProviderChangeRequestInput>({
            query: ({ providerId, ...body }) => ({ url: `/owner/autocare-providers/${encodeURIComponent(providerId)}/change-requests`, method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareProviderChangeRequestSchema.parse(value),
            invalidatesTags: (_result, _error, { providerId }) => [{ type: 'AutoCareProvider', id: `CHANGES_${providerId}` }],
        }),
cancelOwnerAutoCareProviderChangeRequest: build.mutation<AutoCareProviderChangeRequest, { providerId: string; requestId: string }>({
            query: ({ providerId, requestId }) => ({ url: `/owner/autocare-providers/${encodeURIComponent(providerId)}/change-requests/${encodeURIComponent(requestId)}`, method: 'DELETE' }),
            transformResponse: (value: unknown) => autoCareProviderChangeRequestSchema.parse(value),
            invalidatesTags: (_result, _error, { providerId }) => [{ type: 'AutoCareProvider', id: `CHANGES_${providerId}` }],
        }),
getAdminAutoCareProviderChangeRequests: build.query<AutoCareProviderChangeRequest[], { status?: AutoCareProviderChangeRequest['status']; kind?: AutoCareProviderChangeRequest['kind'] } | void>({
            query: (params) => ({ url: '/admin/autocare-provider-change-requests', params: params ?? undefined }),
            transformResponse: (value: unknown) => z.array(autoCareProviderChangeRequestSchema).parse(value),
            providesTags: [{ type: 'AutoCareProvider', id: 'CHANGE_QUEUE' }],
        }),
decideAdminAutoCareProviderChangeRequest: build.mutation<AutoCareProviderChangeRequest, DecideAutoCareProviderChangeRequestInput>({
            query: ({ id, ...body }) => ({ url: `/admin/autocare-provider-change-requests/${encodeURIComponent(id)}/decision`, method: 'PATCH', body }),
            transformResponse: (value: unknown) => autoCareProviderChangeRequestSchema.parse(value),
            invalidatesTags: (result) => [
                { type: 'AutoCareProvider', id: 'CHANGE_QUEUE' },
                { type: 'AutoCareProvider', id: 'OWNER_LIST' },
                ...(result ? [{ type: 'AutoCareProvider' as const, id: `CHANGES_${result.providerId}` }] : []),
            ],
        })
    }
}
