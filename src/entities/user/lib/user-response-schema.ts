import { z } from 'zod'

import type { CursorPage } from '@/shared/api/cursorPagination'
import type { OwnerClient, User } from '../model/types'
import { SUPPORTED_LOCALES } from '@/shared/config/i18n'

export const userSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
    role: z.enum(['client', 'owner', 'admin', 'super_admin']),
    status: z.enum(['active', 'blocked']),
    avatarUrl: z.string().nullable(),
    locale: z.enum(SUPPORTED_LOCALES).nullable(),
    provider: z.enum(['email', 'google', 'yandex']),
    emailVerifiedAt: z.string().nullable(),
    emailNotifications: z.boolean(),
    bookingEmailNotifications: z.boolean(),
    preferredCity: z.string().nullable(),
    preferredCategories: z.array(z.string()),
    createdAt: z.string(),
}) satisfies z.ZodType<User>

const ownerClientSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
}) satisfies z.ZodType<OwnerClient>

const userPageSchema = z.object({
    items: z.array(userSchema),
    nextCursor: z.string().nullable(),
}) satisfies z.ZodType<CursorPage<User>>

const adminUserSchema = userSchema.extend({
    emailNotifications: z.boolean().default(true),
    bookingEmailNotifications: z.boolean().default(true),
    preferredCity: z.string().nullable().default(null),
    preferredCategories: z.array(z.string()).default([]),
    locale: z.enum(SUPPORTED_LOCALES).nullable().default(null),
}) satisfies z.ZodType<User>

const adminUserPageSchema = z.object({
    items: z.array(adminUserSchema),
    nextCursor: z.string().nullable(),
}) satisfies z.ZodType<CursorPage<User>>

const createAdminResponseSchema = z.object({
    user: adminUserSchema,
    passwordSetupToken: z.string().min(1),
    passwordSetupExpiresAt: z.string(),
})

const accountDeletionRequestSchema = z.object({
    id: z.string(),
    status: z.enum(['pending', 'cancelled', 'completed']),
    requestedAt: z.string().datetime({ offset: true }),
    cancelledAt: z.string().datetime({ offset: true }).nullable(),
    completedAt: z.string().datetime({ offset: true }).nullable(),
})

const userDataExportSchema = z.object({
    schemaVersion: z.number().int().positive(),
    generatedAt: z.string().datetime({ offset: true }),
    integrity: z.object({
        algorithm: z.literal('sha256'),
        checksum: z.string().min(1),
    }),
}).passthrough()

export type AccountDeletionRequest = z.infer<typeof accountDeletionRequestSchema>
export type UserDataExport = z.infer<typeof userDataExportSchema>

export function normalizeUserResponse(value: unknown): User {
    return userSchema.parse(value)
}

export function normalizeUserListResponse(value: unknown): User[] {
    return z.array(userSchema).parse(value)
}

export function normalizeAdminUserResponse(value: unknown): User {
    return adminUserSchema.parse(value)
}

export function normalizeAdminUserListResponse(value: unknown): User[] {
    return z.array(adminUserSchema).parse(value)
}

export function normalizeUserPageResponse(value: unknown): CursorPage<User> {
    return Array.isArray(value)
        ? { items: normalizeUserListResponse(value), nextCursor: null }
        : userPageSchema.parse(value)
}

export function normalizeAdminUserPageResponse(value: unknown): CursorPage<User> {
    return Array.isArray(value)
        ? { items: normalizeAdminUserListResponse(value), nextCursor: null }
        : adminUserPageSchema.parse(value)
}

export function normalizeOwnerClientListResponse(value: unknown): OwnerClient[] {
    return z.array(ownerClientSchema).parse(value)
}

export function normalizeCreateAdminResponse(value: unknown) {
    return createAdminResponseSchema.parse(value)
}

export function normalizeAccountDeletionRequest(value: unknown) {
    return value === null ? null : accountDeletionRequestSchema.parse(value)
}

export function normalizeUserDataExport(value: unknown) {
    return userDataExportSchema.parse(value)
}
