export const MAX_FORM_DRAFT_BYTES = 64 * 1024
export const FORM_DRAFT_VERSION = 1

export type FormDraftParser<T> = (value: unknown) => T | null

function getStorage(): Storage | null {
    if (typeof window === 'undefined') {
        return null
    }

    try {
        return window.localStorage ?? null
    } catch {
        return null
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function readFormDraft<T>(
    storageKey: string,
    parse: FormDraftParser<T>,
): T | null {
    const storage = getStorage()

    if (!storage) {
        return null
    }

    try {
        const rawValue = storage.getItem(storageKey)

        if (!rawValue || rawValue.length > MAX_FORM_DRAFT_BYTES) {
            return null
        }

        const parsedValue: unknown = JSON.parse(rawValue)

        if (!isRecord(parsedValue)) {
            return null
        }

        const draftValue = parsedValue.version === FORM_DRAFT_VERSION && 'data' in parsedValue
            ? parsedValue.data
            : !('version' in parsedValue)
                ? parsedValue
                : null

        return parse(draftValue)
    } catch {
        return null
    }
}

export function writeFormDraft<T>(storageKey: string, value: T): boolean {
    const storage = getStorage()

    if (!storage) {
        return false
    }

    try {
        const serializedValue = JSON.stringify({
            version: FORM_DRAFT_VERSION,
            data: value,
        })

        if (
            typeof serializedValue !== 'string' ||
            serializedValue.length > MAX_FORM_DRAFT_BYTES
        ) {
            return false
        }

        storage.setItem(storageKey, serializedValue)
        return true
    } catch {
        return false
    }
}

export function clearFormDraft(storageKey: string): void {
    const storage = getStorage()

    if (!storage) {
        return
    }

    try {
        storage.removeItem(storageKey)
    } catch {
        // Storage can be unavailable in privacy-restricted browser contexts.
    }
}
