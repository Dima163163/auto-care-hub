export type OwnerProviderProfileDraftText = {
    name: string
    description: string
    websiteUrl: string
    metroStation: string
    warrantyText: string
    yearsActive: string
    staffCount: string
    workstationCount: string
    brandSpecializations: string
}

export type OwnerProviderProfileDraft = {
    text: OwnerProviderProfileDraftText
    isMultibrand: boolean
}

// Contact identifiers, private document references, and file handles stay out
// of browser drafts. They must be re-entered or reselected in the active form.

export function parseOwnerProviderProfileDraft(value: unknown): OwnerProviderProfileDraft | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
    const source = value as Record<string, unknown>
    if (typeof source.text !== 'object' || source.text === null || Array.isArray(source.text)) return null

    const text = source.text as Record<string, unknown>
    const readString = (key: keyof OwnerProviderProfileDraftText) => {
        const item = text[key]
        return typeof item === 'string' && item.length <= 2_000 ? item : ''
    }

    return {
        text: {
            name: readString('name'),
            description: readString('description'),
            websiteUrl: readString('websiteUrl'),
            metroStation: readString('metroStation'),
            warrantyText: readString('warrantyText'),
            yearsActive: readString('yearsActive'),
            staffCount: readString('staffCount'),
            workstationCount: readString('workstationCount'),
            brandSpecializations: readString('brandSpecializations'),
        },
        isMultibrand: typeof source.isMultibrand === 'boolean' ? source.isMultibrand : true,
    }
}
