import { normalizeTextWhitespace } from '../../shared/security/string-normalization.js'

export const MAX_SERVICE_TITLE_LENGTH = 160
export const MAX_SERVICE_DESCRIPTION_LENGTH = 500
export const MAX_SERVICE_DURATION_MINUTES = 1_440
export const MAX_SERVICE_PRICE = 1_000_000
export const MAX_SERVICE_LIST = 200

export function normalizeServiceTitle(title: string) {
    const normalized = normalizeTextWhitespace(title).replace(/\s+/g, ' ').trim()
    if (normalized.length < 2 || normalized.length > MAX_SERVICE_TITLE_LENGTH) {
        throw new Error('Service title is invalid.')
    }

    return normalized
}

export function normalizeServiceDescription(description: string | null | undefined) {
    if (description === null || description === undefined) return description

    const normalized = normalizeTextWhitespace(description).replace(/\s+/g, ' ').trim()
    if (normalized.length > MAX_SERVICE_DESCRIPTION_LENGTH) {
        throw new Error('Service description is invalid.')
    }

    return normalized
}

export function assertServiceDuration(durationMinutes: number) {
    if (!Number.isSafeInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > MAX_SERVICE_DURATION_MINUTES) {
        throw new Error('Service duration is invalid.')
    }
    return durationMinutes
}

export function assertServicePrice(price: number) {
    if (!Number.isSafeInteger(price) || price < 1 || price > MAX_SERVICE_PRICE) {
        throw new Error('Service price is invalid.')
    }
    return price
}

export function assertServiceNumbers(durationMinutes: number, price: number) {
    assertServiceDuration(durationMinutes)
    assertServicePrice(price)

    return { durationMinutes, price }
}

export function normalizeServiceInput(input: {
    title?: string
    description?: string | null
    durationMinutes?: number
    price?: number
}) {
    return {
        ...(input.title === undefined ? {} : { title: normalizeServiceTitle(input.title) }),
        ...(input.description === undefined ? {} : { description: normalizeServiceDescription(input.description) }),
        ...(input.durationMinutes === undefined
            ? {}
            : { durationMinutes: assertServiceDuration(input.durationMinutes) }),
        ...(input.price === undefined
            ? {}
            : { price: assertServicePrice(input.price) }),
    }
}
