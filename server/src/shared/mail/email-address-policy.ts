import { z } from 'zod'

import { stripControlCharacters } from '../security/string-normalization.js'

export const MAX_EMAIL_ADDRESS_LENGTH = 320

export function normalizeEmailAddress(value: string) {
    const normalized = stripControlCharacters(value).trim().toLowerCase()
    const result = z.string().max(MAX_EMAIL_ADDRESS_LENGTH).email().safeParse(normalized)
    if (!result.success) {
        throw new Error('Email address is invalid.')
    }

    return result.data
}
