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
    }
    return parsed as Record<string, boolean> & Record<string, string>
}

export function toMarketProfileInput(draft: MarketProfileDraft): SuperAdminMarketProfileInput {
    return {
        defaultLocale: draft.defaultLocale.trim(),
        supportedLocales: draft.supportedLocales.split(',').map((item) => item.trim()).filter(Boolean),
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
    return parsed as Record<string, string>
}
