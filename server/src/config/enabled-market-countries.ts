/**
 * Countries whose AutoCare marketplace is enabled in the current deployment.
 * Keep this independent from data residency: product geography never selects
 * which database, object store, queue, or encryption key handles user data.
 * Add a country only after its legal, operational, and regional storage gates
 * have been completed.
 */
export const ENABLED_AUTOCARE_COUNTRY_CODES = Object.freeze(['RU'] as const)
const enabledAutoCareCountryCodes = new Set<string>(ENABLED_AUTOCARE_COUNTRY_CODES)

export function isAutoCareCountryEnabled(countryCode: string | null | undefined) {
    return typeof countryCode === 'string'
        && enabledAutoCareCountryCodes.has(countryCode.trim().toUpperCase())
}
