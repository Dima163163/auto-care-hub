import { baseApi } from '@/shared/api/baseApi'

import type { OwnerClient, User, UserRole, UserStatus } from '../model/types'
import type { CursorPage, CursorQuery } from '@/shared/api/cursorPagination'
import type { SupportedLocale } from '@/shared/config/i18n'
import {
    normalizeCreateAdminResponse,
    normalizeAdminUserListResponse,
    normalizeAdminUserPageResponse,
    normalizeAdminUserResponse,
    normalizeAccountDeletionRequest,
    normalizeOwnerClientListResponse,
    normalizeUserResponse,
    normalizeUserDataExport,
} from '../lib/user-response-schema'
import type { AccountDeletionRequest, UserDataExport } from '../lib/user-response-schema'

type UpdateAdminUserStatusRequest = {
    id: string
    status: UserStatus
}

type CreateAdminRequest = {
    name: string
    email: string
}

type UpdateAdminUserRoleRequest = {
    id: string
    role: UserRole
}

export type CreateAdminResponse = {
    user: User
    passwordSetupToken: string
    passwordSetupExpiresAt: string
}

type UpdateUserPreferencesRequest = {
    emailNotifications?: boolean
    bookingEmailNotifications?: boolean
    preferredCity?: string | null
    preferredCategories?: string[]
    locale?: SupportedLocale | null
}

type RequestAccountDeletionRequest = {
    reason?: string
}

export type AdminUsersQuery = CursorQuery & {
    search?: string
    role?: UserRole
    status?: UserStatus
}

export const usersApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        // Получение всех users в админке
        getAdminUsers: build.query<User[], void>({
            query: () => '/admin/users',
            transformResponse: normalizeAdminUserListResponse,
            providesTags: (result) =>
                result
                    ? [
                        ...result.map((user) => ({
                            type: 'User' as const,
                            id: user.id
                        })),
                        {
                            type: 'User' as const,
                            id: 'ADMIN_LIST'
                        }
                    ]
                    : [
                        {
                            type: 'User' as const,
                            id: 'ADMIN_LIST'
                        }
                    ]
        }),

        getAdminUsersPage: build.query<CursorPage<User>, AdminUsersQuery>({
            query: (query) => ({
                url: '/admin/users',
                params: query,
            }),
            transformResponse: normalizeAdminUserPageResponse,
            providesTags: (result) => [
                {
                    type: 'User' as const,
                    id: 'ADMIN_LIST',
                },
                ...(result?.items ?? []).map((user) => ({
                    type: 'User' as const,
                    id: user.id,
                })),
            ],
        }),

        getOwnerClients: build.query<OwnerClient[], void>({
            query: () => '/owner/clients',
            transformResponse: normalizeOwnerClientListResponse,
            providesTags: (result) =>
                result
                    ? [
                        ...result.map((user) => ({
                            type: 'User' as const,
                            id: user.id
                        })),
                        {
                            type: 'User' as const,
                            id: 'CLIENT_LIST'
                        }
                    ]
                    : [
                        {
                            type: 'User' as const,
                            id: 'CLIENT_LIST'
                        }
                    ]
        }),

        updateAdminUserStatus: build.mutation<User, UpdateAdminUserStatusRequest>({
            query: ({ id, status }) => ({
                url: `/admin/users/${id}/status`,
                method: 'PATCH',
                body: {
                    status
                }
            }),
            transformResponse: normalizeAdminUserResponse,
            invalidatesTags: (_result, _error, { id }) => [
                {
                    type: 'User',
                    id
                },
                {
                    type: 'User',
                    id: 'ADMIN_LIST'
                },
                {
                    type: 'User',
                    id: 'CLIENT_LIST'
                },
                'AuditLogs',
            ]
        }),

        updateAdminUserRole: build.mutation<User, UpdateAdminUserRoleRequest>({
            query: ({ id, role }) => ({
                url: `/admin/users/${id}/role`,
                method: 'PATCH',
                body: {
                    role
                }
            }),
            transformResponse: normalizeAdminUserResponse,
            invalidatesTags: (_result, _error, { id }) => [
                {
                    type: 'User',
                    id
                },
                {
                    type: 'User',
                    id: 'ADMIN_LIST'
                },
                {
                    type: 'User',
                    id: 'CLIENT_LIST'
                },
                'AuditLogs',
            ]
        }),

        createAdminUser: build.mutation<CreateAdminResponse, CreateAdminRequest>({
            query: (body) => ({
                url: '/admin/admins',
                method: 'POST',
                body,
            }),
            transformResponse: normalizeCreateAdminResponse,
            invalidatesTags: [
                {
                    type: 'User',
                    id: 'ADMIN_LIST'
                },
                'AuditLogs',
            ]
        }),

        updateUserPreferences: build.mutation<User, UpdateUserPreferencesRequest>({
            query: (body) => ({
                url: '/users/me/preferences',
                method: 'PATCH',
                body,
            }),
            transformResponse: normalizeUserResponse,
            invalidatesTags: [
                {
                    type: 'User',
                    id: 'ME',
                },
            ],
        }),

        exportMyData: build.query<UserDataExport, void>({
            query: () => '/users/me/export',
            transformResponse: normalizeUserDataExport,
        }),

        getAccountDeletionRequest: build.query<AccountDeletionRequest | null, void>({
            query: () => '/users/me/deletion-request',
            transformResponse: normalizeAccountDeletionRequest,
            providesTags: [{ type: 'User', id: 'ME' }],
        }),

        requestAccountDeletion: build.mutation<AccountDeletionRequest | null, RequestAccountDeletionRequest>({
            query: (body) => ({
                url: '/users/me/deletion-request',
                method: 'POST',
                body,
            }),
            transformResponse: normalizeAccountDeletionRequest,
            invalidatesTags: [{ type: 'User', id: 'ME' }],
        }),

        cancelAccountDeletion: build.mutation<AccountDeletionRequest | null, void>({
            query: () => ({
                url: '/users/me/deletion-request',
                method: 'DELETE',
            }),
            transformResponse: normalizeAccountDeletionRequest,
            invalidatesTags: [{ type: 'User', id: 'ME' }],
        }),

    })
})

export const {
    useGetAdminUsersQuery,
    useGetAdminUsersPageQuery,
    useGetOwnerClientsQuery,
    useUpdateAdminUserStatusMutation,
    useUpdateAdminUserRoleMutation,
    useCreateAdminUserMutation,
    useUpdateUserPreferencesMutation,
    useLazyExportMyDataQuery,
    useGetAccountDeletionRequestQuery,
    useRequestAccountDeletionMutation,
    useCancelAccountDeletionMutation,
} = usersApi
