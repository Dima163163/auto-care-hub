import { z } from 'zod'

const oauthTokenResponseBaseSchema = z.object({
    access_token: z.string().trim().min(1).max(4_096),
    expires_in: z.number().int().nonnegative().max(31_536_000),
    refresh_token: z.string().trim().min(1).max(4_096).optional(),
    token_type: z.string().trim().min(1).max(64),
})

export const googleTokenResponseSchema = oauthTokenResponseBaseSchema.extend({
    scope: z.string().max(4_096),
    id_token: z.string().trim().min(1).max(16_384),
})

export const yandexTokenResponseSchema = oauthTokenResponseBaseSchema

export const googleProfileResponseSchema = z.object({
    sub: z.string().trim().min(1).max(256),
    name: z.string().trim().min(1).max(512),
    email: z.string().trim().email().max(320),
    email_verified: z.boolean(),
    picture: z.string().trim().max(2_048).optional(),
})

export const yandexProfileResponseSchema = z.object({
    id: z.string().trim().min(1).max(256),
    display_name: z.string().trim().min(1).max(512),
    default_email: z.string().trim().email().max(320),
    emails: z.array(z.string().trim().email().max(320)).max(32),
    real_name: z.string().trim().max(512).optional(),
    first_name: z.string().trim().max(256).optional(),
    last_name: z.string().trim().max(256).optional(),
    default_avatar_id: z.string().trim().max(512).optional(),
    is_avatar_empty: z.boolean().optional(),
})

export type GoogleTokenResponse = z.infer<typeof googleTokenResponseSchema>
export type GoogleProfileResponse = z.infer<typeof googleProfileResponseSchema>
export type YandexTokenResponse = z.infer<typeof yandexTokenResponseSchema>
export type YandexProfileResponse = z.infer<typeof yandexProfileResponseSchema>
