import type { AutomotiveProviderBusinessType, AutomotiveProviderCommunicationMode, AutomotiveProviderResponseHours, AutomotiveProviderTeamSize } from '../../entities/automotive/automotive.entity.js'
import type { UpdateAutoCareCommunicationSettingsInput } from './autocare.types.js'
import { normalizeProviderMembershipUuid } from './provider-membership-policy.js'

const communicationKeys = [
    'teamSize',
    'businessType',
    'chatEnabled',
    'communicationMode',
    'responseWindowMinutes',
    'responseHours',
    'phoneBookingEnabled',
    'callbackEnabled',
    'requestPhotosEnabled',
    'publicContactNote',
] as const

const teamSizes = new Set<AutomotiveProviderTeamSize>(['solo', 'small_team', 'team', 'enterprise'])
const businessTypes = new Set<AutomotiveProviderBusinessType>(['sole_proprietor', 'self_employed', 'company', 'private_master', 'other'])
const communicationModes = new Set<AutomotiveProviderCommunicationMode>(['online', 'request_then_confirm', 'phone_only'])
const responseHoursValues = new Set<AutomotiveProviderResponseHours>(['working_hours', 'always_on'])

function hasOnlyCommunicationKeys(value: Record<string, unknown>) {
    const allowed = new Set<string>(communicationKeys)
    return Object.keys(value).length === communicationKeys.length && Object.keys(value).every((key) => allowed.has(key))
}

function normalizeEnum<T extends string>(value: unknown, values: Set<T>) {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim().toLowerCase() as T
    return values.has(normalized) ? normalized : null
}

function normalizeContactNote(value: unknown) {
    if (value === null) return null
    if (typeof value !== 'string') return undefined
    const normalized = value.normalize('NFKC').trim()
    return normalized.length <= 240 ? normalized || null : undefined
}

function normalizeResponseWindow(value: unknown) {
    if (value === null) return null
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 15 && value <= 10_080 ? value : undefined
}

/**
 * The HTTP route validates this payload with Zod, but jobs, tests and replay
 * handlers can call the service directly. Keep the service boundary strict so
 * an object with provider-owned fields cannot reach Object.assign/save.
 */
export function normalizeAutoCareCommunicationProviderUuid(value: unknown) {
    return normalizeProviderMembershipUuid(value)
}

export function normalizeAutoCareCommunicationSettingsInput(input: unknown): UpdateAutoCareCommunicationSettingsInput | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (!hasOnlyCommunicationKeys(value)) return null

    const teamSize = normalizeEnum(value.teamSize, teamSizes)
    const businessType = normalizeEnum(value.businessType, businessTypes)
    const communicationMode = normalizeEnum(value.communicationMode, communicationModes)
    const responseHours = normalizeEnum(value.responseHours, responseHoursValues)
    const responseWindowMinutes = normalizeResponseWindow(value.responseWindowMinutes)
    const publicContactNote = normalizeContactNote(value.publicContactNote)
    if (!teamSize || !businessType || !communicationMode || !responseHours || responseWindowMinutes === undefined || publicContactNote === undefined) return null
    if (typeof value.chatEnabled !== 'boolean' || typeof value.phoneBookingEnabled !== 'boolean' || typeof value.callbackEnabled !== 'boolean' || typeof value.requestPhotosEnabled !== 'boolean') return null
    if (communicationMode === 'phone_only' && value.chatEnabled) return null
    if (communicationMode === 'phone_only' && !value.phoneBookingEnabled) return null
    if (value.chatEnabled && responseWindowMinutes === null) return null

    return {
        teamSize,
        businessType,
        chatEnabled: value.chatEnabled,
        communicationMode,
        responseWindowMinutes,
        responseHours,
        phoneBookingEnabled: value.phoneBookingEnabled,
        callbackEnabled: value.callbackEnabled,
        requestPhotosEnabled: value.requestPhotosEnabled,
        publicContactNote,
    }
}
