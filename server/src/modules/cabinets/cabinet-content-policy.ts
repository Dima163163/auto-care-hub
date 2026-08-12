import { isValidTimeZone } from '../../shared/date-time/cabinet-timezone.js'
import { normalizeTextWhitespace, stripControlCharacters } from '../../shared/security/string-normalization.js'

export const MAX_CABINET_DESCRIPTION_LENGTH = 5_000
export const MAX_CABINET_ADDRESS_LENGTH = 240
export const MAX_CABINET_CITY_LENGTH = 120
export const MAX_CABINET_POLICY_LENGTH = 2_000
export const MAX_CABINET_AMENITIES = 20
export const MAX_CABINET_AMENITY_LENGTH = 80
export const MAX_CABINET_PRICE = 1_000_000
export const MAX_OWNER_CABINETS = 200

function normalizeText(value: string, minLength: number, maxLength: number, label: string) {
    const normalized = normalizeTextWhitespace(value).replace(/\s+/g, ' ').trim()
    if (normalized.length < minLength || normalized.length > maxLength) {
        throw new Error(`Cabinet ${label} is invalid.`)
    }
    return normalized
}

export function normalizeCabinetDescription(value: string) {
    return normalizeText(value, 10, MAX_CABINET_DESCRIPTION_LENGTH, 'description')
}

export function normalizeCabinetAddress(value: string) {
    return normalizeText(value, 2, MAX_CABINET_ADDRESS_LENGTH, 'address')
}

export function normalizeCabinetCity(value: string) {
    return normalizeText(value, 2, MAX_CABINET_CITY_LENGTH, 'city')
}

export function normalizeCabinetPolicy(value: string | null | undefined) {
    if (value === null || value === undefined) return null
    return normalizeText(value, 0, MAX_CABINET_POLICY_LENGTH, 'policy') || null
}

export function normalizeCabinetAmenities(amenities: string[]) {
    const normalized = [...new Set(amenities.map((amenity) => normalizeText(amenity, 1, MAX_CABINET_AMENITY_LENGTH, 'amenity')))]
    if (normalized.length > MAX_CABINET_AMENITIES) {
        throw new Error('Too many cabinet amenities.')
    }
    return normalized
}

export function assertCabinetPrice(price: number) {
    if (!Number.isSafeInteger(price) || price < 1 || price > MAX_CABINET_PRICE) {
        throw new Error('Cabinet price is invalid.')
    }
    return price
}

export function normalizeCabinetTimezone(timezone: string | undefined) {
    if (timezone === undefined) return undefined
    const normalized = stripControlCharacters(timezone).trim()
    if (!normalized || normalized.length > 80 || !isValidTimeZone(normalized)) {
        throw new Error('Cabinet timezone is invalid.')
    }
    return normalized
}
