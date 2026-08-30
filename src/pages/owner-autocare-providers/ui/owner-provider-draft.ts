export type OwnerProviderTextDraft = {
    name: string
    description: string
    address: string
    hours: string
    yearsActive: string
    staffCount: string
    workstationCount: string
    websiteUrl: string
    metroStation: string
    warrantyText: string
    bonusSummary: string
}

export type OwnerProviderDraft = {
    text: OwnerProviderTextDraft
    isMultibrand: boolean
    chatEnabled: boolean
    communicationMode: 'online' | 'request_then_confirm' | 'phone_only'
    selectedBrands: string[]
    selectedAmenities: string[]
}

// Contact identifiers, document references, and file handles are intentionally
// excluded: browser drafts must not persist PII or private evidence.

export const EMPTY_OWNER_PROVIDER_TEXT_DRAFT: OwnerProviderTextDraft = {
    name: '',
    description: '',
    address: '',
    hours: '',
    yearsActive: '0',
    staffCount: '1',
    workstationCount: '0',
    websiteUrl: '',
    metroStation: '',
    warrantyText: '',
    bonusSummary: '',
}

export const DEFAULT_OWNER_PROVIDER_DRAFT: OwnerProviderDraft = {
    text: EMPTY_OWNER_PROVIDER_TEXT_DRAFT,
    isMultibrand: true,
    chatEnabled: false,
    communicationMode: 'request_then_confirm',
    selectedBrands: [],
    selectedAmenities: [],
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(source: Record<string, unknown>, key: keyof OwnerProviderTextDraft, fallback: string) {
    const value = source[key]
    return typeof value === 'string' && value.length <= 2_000 ? value : fallback
}

function readStringList(source: Record<string, unknown>, key: keyof OwnerProviderDraft) {
    const value = source[key]
    if (!Array.isArray(value)) return []

    return value
        .filter((item): item is string => typeof item === 'string' && item.length > 0 && item.length <= 120)
        .slice(0, 30)
}

export function parseOwnerProviderDraft(value: unknown): OwnerProviderDraft | null {
    if (!isRecord(value) || !isRecord(value.text)) return null

    const text = value.text
    const communicationMode = value.communicationMode
    const parsedMode = communicationMode === 'online' || communicationMode === 'request_then_confirm' || communicationMode === 'phone_only'
        ? communicationMode
        : DEFAULT_OWNER_PROVIDER_DRAFT.communicationMode

    return {
        text: {
            name: readString(text, 'name', ''),
            description: readString(text, 'description', ''),
            address: readString(text, 'address', ''),
            hours: readString(text, 'hours', ''),
            yearsActive: readString(text, 'yearsActive', '0'),
            staffCount: readString(text, 'staffCount', '1'),
            workstationCount: readString(text, 'workstationCount', '0'),
            websiteUrl: readString(text, 'websiteUrl', ''),
            metroStation: readString(text, 'metroStation', ''),
            warrantyText: readString(text, 'warrantyText', ''),
            bonusSummary: readString(text, 'bonusSummary', ''),
        },
        isMultibrand: typeof value.isMultibrand === 'boolean' ? value.isMultibrand : true,
        chatEnabled: typeof value.chatEnabled === 'boolean' ? value.chatEnabled : false,
        communicationMode: parsedMode,
        selectedBrands: readStringList(value, 'selectedBrands'),
        selectedAmenities: readStringList(value, 'selectedAmenities'),
    }
}
