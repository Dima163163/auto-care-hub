import { z } from 'zod'

import { OAUTH_PROVIDERS } from './oauth.types.js'

export const oauthProviderParamsSchema = z.object({
    provider: z.enum(OAUTH_PROVIDERS),
})

export const oauthCallbackQuerySchema = z.object({
    code: z.string().max(2_048).optional(),
    state: z.string().max(512).optional(),
    error: z.string().max(120).optional(),
    error_description: z.string().max(500).optional(),
})
