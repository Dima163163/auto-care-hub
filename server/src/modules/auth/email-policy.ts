export const MAX_AUTH_EMAIL_LENGTH = 254

export function normalizeAuthEmail(email: string) {
    const normalized = email.trim().toLowerCase()
    if (
        normalized.length < 3
        || normalized.length > MAX_AUTH_EMAIL_LENGTH
        || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    ) {
        throw new Error('Email address is invalid.')
    }

    return normalized
}
