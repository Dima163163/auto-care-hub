import type { CreateAutoCareChatInput } from './autocare.types.js'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const chatTypes = new Set<CreateAutoCareChatInput['type']>(['provider_inquiry', 'support', 'admin_escalation'])

function normalizeUuid(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.trim().toLowerCase()
    return uuidPattern.test(normalized) ? normalized : null
}

export function normalizeAutoCareChatUuid(value: unknown): string | null {
    return normalizeUuid(value)
}

function normalizeOptionalUuid(value: unknown): string | undefined | null {
    if (value === undefined) return undefined
    return normalizeUuid(value)
}

function normalizeSubject(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim()
    if (normalized.length < 2 || normalized.length > 160) return null
    if ([...normalized].some((character) => {
        const codePoint = character.codePointAt(0) ?? 0
        return codePoint < 0x20 || codePoint === 0x7f
    })) return null
    return normalized
}

export type NormalizedAutoCareChatInput = {
    type: CreateAutoCareChatInput['type']
    providerId?: string
    requestId?: string
    subject: string
}

/** Re-check chat creation input before any provider lookup or thread persistence. */
export function normalizeAutoCareChatInput(input: unknown): NormalizedAutoCareChatInput | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (Object.keys(value).some((key) => !['type', 'providerId', 'requestId', 'subject'].includes(key))) return null
    if (typeof value.type !== 'string' || !chatTypes.has(value.type as CreateAutoCareChatInput['type'])) return null
    const subject = normalizeSubject(value.subject)
    if (!subject) return null
    const providerId = normalizeOptionalUuid(value.providerId)
    const requestId = normalizeOptionalUuid(value.requestId)
    if (providerId === null || requestId === null) return null
    return {
        type: value.type as CreateAutoCareChatInput['type'],
        ...(providerId ? { providerId } : {}),
        ...(requestId ? { requestId } : {}),
        subject,
    }
}
