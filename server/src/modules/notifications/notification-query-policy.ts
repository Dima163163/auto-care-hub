import { NotificationCategory } from '../../entities/notification/notification.entity.js'

const categories = new Set<NotificationCategory>(Object.values(NotificationCategory))
const allowedKeys = new Set(['cursor', 'limit', 'read', 'category'])
const maxCursorLength = 512

export type NormalizedNotificationsQuery = {
    cursor?: string
    limit?: number
    read?: boolean
    category?: NotificationCategory
}

export function normalizeNotificationsQueryInput(input: unknown): NormalizedNotificationsQuery | null {
    if (input === undefined) return {}
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (Object.keys(value).some((key) => !allowedKeys.has(key))) return null

    let cursor: string | undefined
    if (value.cursor !== undefined) {
        if (typeof value.cursor !== 'string') return null
        cursor = value.cursor.normalize('NFKC').trim() || undefined
        if (cursor && cursor.length > maxCursorLength) return null
    }

    if (value.limit !== undefined && (typeof value.limit !== 'number' || !Number.isSafeInteger(value.limit))) return null
    if (value.read !== undefined && typeof value.read !== 'boolean') return null

    let category: NotificationCategory | undefined
    if (value.category !== undefined) {
        if (typeof value.category !== 'string') return null
        const normalized = value.category.normalize('NFKC').trim().toLowerCase()
        if (!categories.has(normalized as NotificationCategory)) return null
        category = normalized as NotificationCategory
    }

    return {
        ...(cursor ? { cursor } : {}),
        ...(value.limit === undefined ? {} : { limit: value.limit }),
        ...(value.read === undefined ? {} : { read: value.read }),
        ...(category ? { category } : {}),
    }
}
