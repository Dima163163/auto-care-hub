export function normalizeNotificationLink(link: string | null | undefined) {
    if (link === null || link === undefined || link === '') return null
    const normalized = link.trim()
    if (normalized.length > 2_048 || !normalized.startsWith('/') || normalized.startsWith('//') || normalized.includes('\\')) {
        throw new Error('Notification link must be an internal path.')
    }
    return normalized
}
