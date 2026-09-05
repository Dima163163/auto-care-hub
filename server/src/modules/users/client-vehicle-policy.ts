const fuelTypes = new Set(['petrol', 'diesel', 'hybrid', 'electric', 'lpg', 'hydrogen', 'other'] as const)
const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/
const allowedKeys = new Set(['brandId', 'model', 'year', 'fuelType', 'engineDisplacement', 'horsepower', 'color', 'vin', 'licensePlate', 'internalNumber'])

export type NormalizedClientVehicleInput = {
    brandId?: string
    model?: string
    year?: number
    fuelType?: string
    engineDisplacement?: number | null
    horsepower?: number | null
    color?: string
    vin?: string | null
    licensePlate?: string | null
    internalNumber?: string | null
}

function normalizeText(value: unknown, minLength: number, maxLength: number): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim()
    if (normalized.length < minLength || normalized.length > maxLength) return null
    if ([...normalized].some((character) => {
        const codePoint = character.codePointAt(0) ?? 0
        return codePoint < 0x20 || codePoint === 0x7f
    })) return null
    return normalized
}

function normalizeNullableText(value: unknown, maxLength: number): string | null | undefined {
    if (value === null) return null
    if (typeof value !== 'string') return undefined
    const normalized = value.normalize('NFKC').trim()
    if (!normalized) return null
    if (normalized.length > maxLength || [...normalized].some((character) => {
        const codePoint = character.codePointAt(0) ?? 0
        return codePoint < 0x20 || codePoint === 0x7f
    })) return undefined
    return normalized
}

function normalizeNumber(value: unknown, options: { integer: boolean; min: number; max: number }): number | null | undefined {
    if (value === null) return null
    if (typeof value !== 'number' || !Number.isFinite(value) || (options.integer && !Number.isSafeInteger(value)) || value < options.min || value > options.max) return undefined
    return value
}

/** Re-check client vehicle payloads before JSON/PII and identity persistence. */
export function normalizeClientVehicleInput(input: unknown, mode: 'create' | 'patch'): NormalizedClientVehicleInput | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (Object.keys(value).some((key) => !allowedKeys.has(key))) return null
    if (Object.keys(value).some((key) => value[key] === undefined)) return null
    const result: NormalizedClientVehicleInput = {}

    const brandId = value.brandId === undefined ? undefined : normalizeText(value.brandId, 1, 60)?.toLowerCase()
    const model = value.model === undefined ? undefined : normalizeText(value.model, 1, 120)
    const year = normalizeNumber(value.year, { integer: true, min: 1_950, max: 2_100 })
    const fuelType = value.fuelType === undefined ? undefined : typeof value.fuelType === 'string' && fuelTypes.has(value.fuelType as never) ? value.fuelType : null
    const engineDisplacement = normalizeNumber(value.engineDisplacement, { integer: false, min: 0, max: 20 })
    const horsepower = normalizeNumber(value.horsepower, { integer: true, min: 0, max: 3_000 })
    const color = value.color === undefined ? undefined : normalizeText(value.color, 1, 40)
    const normalizedVin = value.vin === undefined ? undefined : value.vin === null ? null : normalizeText(value.vin, 17, 17)?.toUpperCase()
    const vin = normalizedVin === undefined || normalizedVin === null || vinPattern.test(normalizedVin) ? normalizedVin : undefined
    const licensePlate = value.licensePlate === undefined ? undefined : normalizeNullableText(value.licensePlate, 24)
    const internalNumber = value.internalNumber === undefined ? undefined : normalizeNullableText(value.internalNumber, 64)

    if (mode === 'create' && (brandId === undefined || model === null || year === undefined || fuelType === undefined || engineDisplacement === undefined || horsepower === undefined || color === null || vin === undefined)) return null
    if (value.brandId !== undefined && !brandId) return null
    if (value.model !== undefined && !model) return null
    if (value.year !== undefined && year === undefined) return null
    if (value.fuelType !== undefined && !fuelType) return null
    if (value.engineDisplacement !== undefined && engineDisplacement === undefined) return null
    if (value.horsepower !== undefined && horsepower === undefined) return null
    if (value.color !== undefined && !color) return null
    if (value.vin !== undefined && vin === undefined) return null
    if (value.licensePlate !== undefined && licensePlate === undefined) return null
    if (value.internalNumber !== undefined && internalNumber === undefined) return null

    if (brandId !== undefined) result.brandId = brandId
    if (model !== undefined && model !== null) result.model = model
    if (year !== undefined && year !== null) result.year = year
    if (fuelType !== undefined && fuelType !== null) result.fuelType = fuelType
    if (engineDisplacement !== undefined) result.engineDisplacement = engineDisplacement
    if (horsepower !== undefined) result.horsepower = horsepower
    if (color !== undefined && color !== null) result.color = color
    if (vin !== undefined) result.vin = vin
    if (licensePlate !== undefined) result.licensePlate = licensePlate
    if (internalNumber !== undefined) result.internalNumber = internalNumber
    return result
}
