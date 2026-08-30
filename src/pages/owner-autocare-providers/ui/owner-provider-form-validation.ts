export type OwnerProviderDocumentDraft = {
    label: string
    reference: string
    expiresAt: string
}

export type OwnerProviderFormDraft = {
    marketId: string
    name: string
    description: string
    address: string
    hours: string
    yearsActive: string | number
    staffCount: string | number
    workstationCount: string | number
    phones?: string[]
    email?: string
    websiteUrl?: string
    metroStation?: string
    warrantyText?: string
    bonusSummary?: string
    documents?: OwnerProviderDocumentDraft[]
    isMultibrand: boolean
    brandSpecializations: string[]
}

export type OwnerProviderFormValidationReason =
    | 'market'
    | 'name'
    | 'description'
    | 'address'
    | 'hours'
    | 'yearsActive'
    | 'staffCount'
    | 'workstationCount'
    | 'phone'
    | 'email'
    | 'websiteUrl'
    | 'metroStation'
    | 'warrantyText'
    | 'bonusSummary'
    | 'document'
    | 'brands'

export type OwnerProviderFormValidation =
    | {
        valid: true
        marketId: string
        name: string
        description: string | undefined
        address: string
        hours: string
        yearsActive: number
        staffCount: number
        workstationCount: number
        phones: string[]
        email: string | null
        websiteUrl: string | null
        metroStation: string | null
        warrantyText: string | null
        bonusSummary: string | null
        documents: Array<{ label: string; reference: string; expiresAt: string | null }>
    }
    | { valid: false; reason: OwnerProviderFormValidationReason }

const privateReferencePattern = /^private:\/\/[A-Za-z0-9._/-]{1,500}$/
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const datePattern = /^\d{4}-\d{2}-\d{2}$/

function parseInteger(value: string | number, min: number, max: number) {
    const source = String(value).trim()
    if (!/^-?\d+$/.test(source)) return null

    const parsed = Number(source)
    return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : null
}

function normalizeOptional(value: string | undefined, maxLength: number) {
    const normalized = (value ?? '').trim()
    return normalized.length <= maxLength ? normalized || null : undefined
}

function normalizeExpiry(value: string) {
    const normalized = value.trim()
    if (!normalized) return null
    if (!datePattern.test(normalized)) return undefined

    const parsed = new Date(`${normalized}T00:00:00.000Z`)
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) return undefined
    return `${normalized}T00:00:00.000Z`
}

export function validateOwnerProviderForm(draft: OwnerProviderFormDraft): OwnerProviderFormValidation {
    const marketId = draft.marketId.trim()
    if (!marketId) return { valid: false, reason: 'market' }

    const name = draft.name.trim()
    if (name.length < 2 || name.length > 160) return { valid: false, reason: 'name' }

    const description = draft.description.trim()
    if (description.length > 5_000) return { valid: false, reason: 'description' }

    const address = draft.address.trim()
    if (address.length < 2 || address.length > 240) return { valid: false, reason: 'address' }

    const hours = draft.hours.trim()
    if (hours.length < 2 || hours.length > 120) return { valid: false, reason: 'hours' }

    const yearsActive = parseInteger(draft.yearsActive, 0, 150)
    if (yearsActive === null) return { valid: false, reason: 'yearsActive' }

    const staffCount = parseInteger(draft.staffCount, 0, 10_000)
    if (staffCount === null) return { valid: false, reason: 'staffCount' }

    const workstationCount = parseInteger(draft.workstationCount, 0, 100_000)
    if (workstationCount === null) return { valid: false, reason: 'workstationCount' }

    const phones = [...new Set((draft.phones ?? []).map((phone) => phone.trim()).filter(Boolean))]
    if (phones.length > 5 || phones.some((phone) => phone.length < 5 || phone.length > 32)) return { valid: false, reason: 'phone' }

    const email = normalizeOptional(draft.email, 320)
    if (email === undefined || (email !== null && !emailPattern.test(email))) return { valid: false, reason: 'email' }

    const websiteUrl = normalizeOptional(draft.websiteUrl, 500)
    if (websiteUrl === undefined) return { valid: false, reason: 'websiteUrl' }
    if (websiteUrl !== null) {
        try {
            new URL(websiteUrl)
        } catch {
            return { valid: false, reason: 'websiteUrl' }
        }
    }

    const metroStation = normalizeOptional(draft.metroStation, 120)
    if (metroStation === undefined) return { valid: false, reason: 'metroStation' }

    const warrantyText = normalizeOptional(draft.warrantyText, 500)
    if (warrantyText === undefined) return { valid: false, reason: 'warrantyText' }

    const bonusSummary = normalizeOptional(draft.bonusSummary, 500)
    if (bonusSummary === undefined) return { valid: false, reason: 'bonusSummary' }

    if (draft.brandSpecializations.length > 30 || draft.brandSpecializations.some((brand) => brand.trim().length < 1 || brand.trim().length > 80)) {
        return { valid: false, reason: 'brands' }
    }
    if (!draft.isMultibrand && draft.brandSpecializations.length === 0) {
        return { valid: false, reason: 'brands' }
    }

    const documents: Array<{ label: string; reference: string; expiresAt: string | null }> = []
    if ((draft.documents ?? []).length > 20) return { valid: false, reason: 'document' }
    for (const document of draft.documents ?? []) {
        const label = document.label.trim()
        const reference = document.reference.trim()
        if (label.length < 1 || label.length > 160 || !privateReferencePattern.test(reference)) {
            return { valid: false, reason: 'document' }
        }

        const expiresAt = normalizeExpiry(document.expiresAt)
        if (expiresAt === undefined) return { valid: false, reason: 'document' }
        documents.push({ label, reference, expiresAt })
    }

    return {
        valid: true,
        marketId,
        name,
        description: description || undefined,
        address,
        hours,
        yearsActive,
        staffCount,
        workstationCount,
        phones,
        email,
        websiteUrl,
        metroStation,
        warrantyText,
        bonusSummary,
        documents,
    }
}
