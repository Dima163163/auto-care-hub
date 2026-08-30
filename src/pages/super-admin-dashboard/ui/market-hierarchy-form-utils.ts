import type { SuperAdminMarketProfileInput } from '@/entities/automotive-service'

export type MarketProfileDraft = {
    defaultLocale: string
    supportedLocales: string
    timezone: string
    currencyCode: string
    capabilities: string
    legalLinks: string
}

export function createMarketProfileDraft(profile: SuperAdminMarketProfileInput): MarketProfileDraft {
    return {
        defaultLocale: profile.defaultLocale,
        supportedLocales: profile.supportedLocales.join(', '),
        timezone: profile.timezone,
        currencyCode: profile.currencyCode,
        capabilities: JSON.stringify(profile.capabilities, null, 2),
        legalLinks: JSON.stringify(profile.legalLinks, null, 2),
    }
}

function parseRecord(value: string, expected: 'boolean' | 'string') {
    const parsed: unknown = JSON.parse(value || '{}')
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
        throw new Error('Нужно указать JSON-объект.')
    }
    for (const [key, item] of Object.entries(parsed)) {
        if (!key.trim() || typeof item !== expected) {
            throw new Error(expected === 'boolean'
                ? 'Capabilities должны содержать пары «ключ: true/false». '
                : 'Legal links должны содержать пары «ключ: URL».')
        }
        if (expected === 'string') {
            try {
                const url = new URL(item)
                if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported protocol')
            } catch {
                throw new Error('Legal links должны содержать только HTTP(S)-адреса.')
            }
        }
    }
    return parsed as Record<string, boolean> & Record<string, string>
}

export function toMarketProfileInput(draft: MarketProfileDraft): SuperAdminMarketProfileInput {
    const defaultLocale = draft.defaultLocale.trim().toLowerCase()
    const supportedLocales = draft.supportedLocales.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean)
    if (!defaultLocale) throw new Error('Укажите основную локаль.')
    if (supportedLocales.length === 0) throw new Error('Укажите хотя бы одну локаль.')
    if (!supportedLocales.includes(defaultLocale)) throw new Error('Основная локаль должна входить в список локалей.')

    return {
        defaultLocale,
        supportedLocales: [...new Set(supportedLocales)],
        timezone: draft.timezone.trim(),
        currencyCode: draft.currencyCode.trim().toUpperCase(),
        capabilities: parseRecord(draft.capabilities, 'boolean') as Record<string, boolean>,
        legalLinks: parseRecord(draft.legalLinks, 'string') as Record<string, string>,
    }
}

export function parseNames(value: string) {
    const parsed: unknown = JSON.parse(value || '{}')
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object' || Object.keys(parsed).length === 0) {
        throw new Error('Укажите хотя бы одно локализованное название в JSON.')
    }
    if (Object.values(parsed).some((item) => typeof item !== 'string' || !item.trim())) {
        throw new Error('Названия должны быть непустыми строками.')
    }
    return Object.fromEntries(Object.entries(parsed).map(([key, name]) => [key.trim(), name.trim()]))
}

export function parseOptionalFiniteNumber(value: string, label: string, min: number, max: number) {
    const normalized = value.trim()
    if (!normalized) return null

    const parsed = Number(normalized)
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
        throw new Error(`${label}: укажите число от ${min} до ${max}.`)
    }

    return parsed
}
