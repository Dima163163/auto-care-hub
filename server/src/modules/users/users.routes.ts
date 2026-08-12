import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { requireAuth } from '../auth/require-auth.js'
import { validateBody, validateParams } from '../../shared/validation/validate.js'
import { getOwnerClients, updateUserPreferences } from './users.service.js'
import { getUserDataExport } from './data-export.service.js'
import {
    cancelAccountDeletion,
    getAccountDeletionRequest,
    requestAccountDeletion,
} from './account-deletion.service.js'
import {
    addFavoriteCabinet,
    getFavoriteCabinets,
    removeFavoriteCabinet,
    syncFavoriteCabinets,
} from './favorites.service.js'
import type { OwnerClient } from './users.types.js'
import type { PublicUser } from '../auth/public-user.js'
import {
    createRateLimitPreHandler,
    getAuthenticatedUserRateLimitIdentifier,
} from '../../shared/security/rate-limit.js'
import { SUPPORTED_LOCALES } from '../../config/i18n.js'

type OwnerClientsResponse = OwnerClient[]
type UpdatePreferencesResponse = PublicUser

const updatePreferencesSchema = z.object({
    emailNotifications: z.boolean().optional(),
    bookingEmailNotifications: z.boolean().optional(),
    preferredCity: z.string().trim().max(120).nullable().optional(),
    preferredCategories: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
    locale: z.enum(SUPPORTED_LOCALES).nullable().optional(),
})

const updatePreferencesRateLimit = createRateLimitPreHandler({
    maxRequests: 20,
    scope: 'user:preferences',
    windowMs: 60 * 1000,
    keyResolvers: [getAuthenticatedUserRateLimitIdentifier],
})

const dataExportRateLimit = createRateLimitPreHandler({
    maxRequests: 3,
    scope: 'user:data-export',
    windowMs: 60 * 60 * 1000,
    keyResolvers: [getAuthenticatedUserRateLimitIdentifier],
})

const accountDeletionRateLimit = createRateLimitPreHandler({
    maxRequests: 5,
    scope: 'user:account-deletion',
    windowMs: 60 * 60 * 1000,
    keyResolvers: [getAuthenticatedUserRateLimitIdentifier],
})

const accountDeletionRequestSchema = z.object({
    reason: z.string().trim().max(500).optional(),
})

export function getPrivateUserResponseHeaders() {
    return {
        'cache-control': 'no-store',
        pragma: 'no-cache',
    } as const
}

const favoriteCabinetParamsSchema = z.object({
    cabinetId: z.string().uuid(),
})

const syncFavoritesSchema = z.object({
    cabinetIds: z.array(z.string().uuid()).max(100),
})

export async function usersRoutes(app: FastifyInstance) {
    app.get('/users/me/export', { preHandler: dataExportRateLimit }, async (request, reply) => {
        const user = await requireAuth(request)
        const data = await getUserDataExport(user)

        return reply
            .headers(getPrivateUserResponseHeaders())
            .type('application/json; charset=utf-8')
            .send(data)
    })

    app.post('/users/me/deletion-request', { preHandler: accountDeletionRateLimit }, async (request, reply) => {
        const user = await requireAuth(request)
        const body = validateBody(accountDeletionRequestSchema, request.body)

        return reply.headers(getPrivateUserResponseHeaders()).send(
            await requestAccountDeletion(user, body.reason, request),
        )
    })

    app.get('/users/me/deletion-request', async (request, reply) => {
        const user = await requireAuth(request)
        return reply.headers(getPrivateUserResponseHeaders()).send(
            await getAccountDeletionRequest(user),
        )
    })

    app.delete('/users/me/deletion-request', { preHandler: accountDeletionRateLimit }, async (request, reply) => {
        const user = await requireAuth(request)
        return reply.headers(getPrivateUserResponseHeaders()).send(
            await cancelAccountDeletion(user, request),
        )
    })

    app.get('/users/me/favorites', async (request) => {
        const user = await requireAuth(request)

        return getFavoriteCabinets(user)
    })

    app.post<{ Params: { cabinetId: string } }>('/users/me/favorites/sync', async (request) => {
        const user = await requireAuth(request)
        const body = validateBody(syncFavoritesSchema, request.body)

        return syncFavoriteCabinets(user, body.cabinetIds)
    })

    app.post<{ Params: { cabinetId: string } }>('/users/me/favorites/:cabinetId', async (request) => {
        const user = await requireAuth(request)
        const params = validateParams(favoriteCabinetParamsSchema, request.params)

        return addFavoriteCabinet(user, params.cabinetId)
    })

    app.delete<{ Params: { cabinetId: string } }>('/users/me/favorites/:cabinetId', async (request) => {
        const user = await requireAuth(request)
        const params = validateParams(favoriteCabinetParamsSchema, request.params)

        return removeFavoriteCabinet(user, params.cabinetId)
    })

    app.patch<{ Body: unknown; Reply: UpdatePreferencesResponse }>(
        '/users/me/preferences',
        {
            preHandler: updatePreferencesRateLimit,
        },
        async (request) => {
            const user = await requireAuth(request)
            const body = validateBody(updatePreferencesSchema, request.body)

            return updateUserPreferences(user, body)
        }
    )

    app.get<{ Reply: OwnerClientsResponse }>(
        '/owner/clients',
        async (request) => {
            const user = await requireAuth(request)

            return getOwnerClients(user)
        }
    )
}
