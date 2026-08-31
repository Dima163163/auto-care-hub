export const PILOT_JOURNEY_EVENTS = [
    'request_created',
    'quote_sent',
    'quote_accepted',
    'quote_declined',
    'rescheduled',
    'cancelled',
    'completed',
    'review_submitted',
    'review_photo_submitted',
    'bonus_granted',
    'bonus_redeemed',
    'complaint_submitted',
    'support_contacted',
    'support_resolved',
] as const

export type PilotJourneyEvent = (typeof PILOT_JOURNEY_EVENTS)[number]

export type PilotEvidence = {
    schemaVersion: 1
    source: 'real'
    environment: 'staging' | 'production'
    marketId: string
    collectedAt: string
    providers: Array<{
        id: string
        verified: boolean
        consentRecorded: boolean
        bookingMode: 'online' | 'request_call' | 'phone'
    }>
    clients: Array<{
        id: string
        consentRecorded: boolean
        vehicleRefs: string[]
    }>
    vehicles: Array<{
        id: string
        clientId: string
        make: string
        model: string
        year: number
        plateCaptured: boolean
        vinCaptured: boolean
    }>
    journeys: Array<{
        id: string
        providerId: string
        clientId: string
        path: 'fixed' | 'quote'
        events: PilotJourneyEvent[]
        reviewPhotoCount: number
    }>
    metrics: {
        responseSamples: number
        responseP50Minutes: number | null
        responseP95Minutes: number | null
        confirmationSamples: number
        confirmationRatePercent: number
        bookingCount: number
        cancelCount: number
        noShowCount: number
        duplicateSubmissionChecks: number
        duplicateRequestsCreated: number
    }
    privacy: {
        piiRedacted: boolean
        evidenceRetentionDays: number
    }
}

export type PilotEvidenceCheck = {
    name: string
    status: 'pass' | 'blocked'
    detail: string
}

type PilotEvidenceInput = Partial<PilotEvidence> & Record<string, unknown>

function pass(name: string, detail: string): PilotEvidenceCheck {
    return { name, status: 'pass', detail }
}

function blocked(name: string, detail: string): PilotEvidenceCheck {
    return { name, status: 'blocked', detail }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finiteNonNegative(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

const PII_KEY_PATTERN = /(?:^|_)(?:email|phone|mobile|telephone|vin|plate|license|address|street|full_name|first_name|last_name|author_name|message|chat|photo(?:_bytes|_data)?)(?:$|_)/i
const PII_VALUE_PATTERNS = [
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
    /(?:^|\D)\+?\d[\d\s().-]{7,}\d(?:$|\D)/,
    /\b[A-HJ-NPR-Z0-9]{17}\b/i,
]

function findPiiPath(value: unknown, currentPath = '$'): string | null {
    if (typeof value === 'string') {
        // ISO timestamps are expected evidence metadata, not phone numbers.
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null
        return PII_VALUE_PATTERNS.some((pattern) => pattern.test(value)) ? currentPath : null
    }
    if (Array.isArray(value)) {
        for (const [index, item] of value.entries()) {
            const match = findPiiPath(item, `${currentPath}[${index}]`)
            if (match) return match
        }
        return null
    }
    if (!isRecord(value)) return null
    for (const [key, child] of Object.entries(value)) {
        const childPath = `${currentPath}.${key}`
        const normalizedKey = key.replace(/[A-Z]/g, (character) => `_${character.toLowerCase()}`)
        const isCaptureFlag = /^(?:plate|vin)_captured$/.test(normalizedKey) && typeof child === 'boolean'
        const isPhotoCount = normalizedKey === 'review_photo_count' && typeof child === 'number'
        if (!isCaptureFlag && !isPhotoCount && PII_KEY_PATTERN.test(normalizedKey)) return childPath
        const match = findPiiPath(child, childPath)
        if (match) return match
    }
    return null
}

function validateParticipants(input: PilotEvidenceInput): PilotEvidenceCheck[] {
    const providers = Array.isArray(input.providers) ? input.providers : []
    const clients = Array.isArray(input.clients) ? input.clients : []
    const vehicles = Array.isArray(input.vehicles) ? input.vehicles : []
    const checks: PilotEvidenceCheck[] = []

    const providerIds = providers.filter(isRecord).map((provider) => provider.id)
    if (providers.length >= 2
        && providerIds.length === providers.length
        && providerIds.every((id) => typeof id === 'string' && id.trim().length > 0)
        && new Set(providerIds).size === providers.length) {
        checks.push(pass('Real providers', `${providers.length} provider records supplied`))
    } else {
        checks.push(blocked('Real providers', 'at least two distinct providers are required'))
    }

    const clientIdValues = clients.filter(isRecord).map((client) => client.id)
    if (clients.length >= 5
        && clients.length <= 10
        && clientIdValues.length === clients.length
        && new Set(clientIdValues).size === clients.length
        && clients.every((client) => isRecord(client) && client.consentRecorded === true)) {
        checks.push(pass('Real clients and consent', `${clients.length} consented client records supplied`))
    } else {
        checks.push(blocked('Real clients and consent', '5–10 real clients with recorded consent are required'))
    }

    const validProviders = providers.every((provider) => isRecord(provider)
        && typeof provider.id === 'string'
        && provider.verified === true
        && provider.consentRecorded === true
        && ['online', 'request_call', 'phone'].includes(String(provider.bookingMode)))
    if (validProviders) checks.push(pass('Provider verification', 'all providers are verified and consented'))
    else checks.push(blocked('Provider verification', 'each provider must be verified, consented and have a booking mode'))

    const clientIdSet = new Set(clients.filter(isRecord).map((client) => String(client.id)))
    const vehicleIds = vehicles.filter(isRecord).map((vehicle) => vehicle.id)
    const validVehicles = vehicles.length >= clients.length
        && vehicleIds.length === vehicles.length
        && new Set(vehicleIds).size === vehicles.length
        && vehicles.every((vehicle) => isRecord(vehicle)
            && typeof vehicle.id === 'string'
            && typeof vehicle.clientId === 'string'
            && clientIdSet.has(vehicle.clientId)
            && typeof vehicle.make === 'string'
            && typeof vehicle.model === 'string'
            && Number.isInteger(vehicle.year)
            && vehicle.year >= 1950
            && vehicle.year <= new Date().getUTCFullYear() + 1
            && vehicle.plateCaptured === true)
    if (validVehicles) checks.push(pass('Vehicle identity coverage', `${vehicles.length} vehicles with captured plate metadata supplied`))
    else checks.push(blocked('Vehicle identity coverage', 'every client needs a real vehicle record with make, model, year and captured plate metadata'))

    const vehicleIdSet = new Set(vehicleIds.map(String))
    const clientsWithVehicles = clients.filter(isRecord).filter((client) => Array.isArray(client.vehicleRefs)
        && client.vehicleRefs.length > 0
        && client.vehicleRefs.every((vehicleRef) => typeof vehicleRef === 'string' && vehicleIdSet.has(vehicleRef)))
    if (clientsWithVehicles.length === clients.length) checks.push(pass('Client garage linkage', 'all clients link to at least one vehicle'))
    else checks.push(blocked('Client garage linkage', 'each client must link to at least one captured vehicle'))

    return checks
}

function validateJourneys(input: PilotEvidenceInput): PilotEvidenceCheck[] {
    const providers = Array.isArray(input.providers) ? input.providers : []
    const clients = Array.isArray(input.clients) ? input.clients : []
    const journeys = Array.isArray(input.journeys) ? input.journeys : []
    const providerIds = new Set(providers.filter(isRecord).map((provider) => String(provider.id)))
    const clientIds = new Set(clients.filter(isRecord).map((client) => String(client.id)))
    const checks: PilotEvidenceCheck[] = []

    const journeyIds = journeys.filter(isRecord).map((journey) => journey.id)
    const validJourneys = journeys.length > 0
        && journeyIds.length === journeys.length
        && journeyIds.every((id) => typeof id === 'string' && id.trim().length > 0)
        && new Set(journeyIds).size === journeys.length
        && journeys.every((journey) => isRecord(journey)
        && typeof journey.id === 'string'
        && providerIds.has(String(journey.providerId))
        && clientIds.has(String(journey.clientId))
        && ['fixed', 'quote'].includes(String(journey.path))
        && Array.isArray(journey.events)
        && journey.events.every((event) => (PILOT_JOURNEY_EVENTS as readonly string[]).includes(String(event)))
        && Number.isInteger(journey.reviewPhotoCount)
        && finiteNonNegative(journey.reviewPhotoCount))
    if (validJourneys) checks.push(pass('Pilot journeys', `${journeys.length} journeys reference known providers and clients`))
    else checks.push(blocked('Pilot journeys', 'journeys must use known participants, fixed/quote paths and allowed events'))

    const paths = new Set(journeys.filter(isRecord).map((journey) => String(journey.path)))
    if (paths.has('fixed') && paths.has('quote')) checks.push(pass('Fixed and quote paths', 'both pricing paths were exercised'))
    else checks.push(blocked('Fixed and quote paths', 'at least one fixed-price and one quote-required journey are required'))

    const journeyProviderIds = new Set(journeys.filter(isRecord).map((journey) => String(journey.providerId)))
    if (providerIds.size >= 2 && [...providerIds].every((providerId) => journeyProviderIds.has(providerId))) checks.push(pass('Provider participation', 'both providers have recorded customer journeys'))
    else checks.push(blocked('Provider participation', 'each provider must have at least one recorded journey'))

    const journeyClientIds = new Set(journeys.filter(isRecord).map((journey) => String(journey.clientId)))
    if (clientIds.size >= 5 && [...clientIds].every((clientId) => journeyClientIds.has(clientId))) checks.push(pass('Client participation', 'every consented pilot client has a recorded journey'))
    else checks.push(blocked('Client participation', 'each consented pilot client must have at least one recorded journey'))

    const observedEvents = new Set(journeys.flatMap((journey) => isRecord(journey) && Array.isArray(journey.events) ? journey.events.map(String) : []))
    const missingEvents = PILOT_JOURNEY_EVENTS.filter((event) => !observedEvents.has(event))
    if (missingEvents.length === 0) checks.push(pass('Journey lifecycle coverage', 'request, quote, booking, review, bonus, complaint and support events are present'))
    else checks.push(blocked('Journey lifecycle coverage', `missing events: ${missingEvents.join(', ')}`))

    const photoEventHasPhoto = journeys.some((journey) => isRecord(journey)
        && Array.isArray(journey.events)
        && journey.events.includes('review_photo_submitted')
        && typeof journey.reviewPhotoCount === 'number'
        && journey.reviewPhotoCount > 0)
    if (photoEventHasPhoto) checks.push(pass('Review photo evidence', 'at least one review includes a photo reference'))
    else checks.push(blocked('Review photo evidence', 'a review-photo journey with a positive photo count is required'))

    return checks
}

function validateMetrics(input: PilotEvidenceInput): PilotEvidenceCheck[] {
    const metrics: Record<string, unknown> = isRecord(input.metrics) ? input.metrics : {}
    const checks: PilotEvidenceCheck[] = []
    const requiredNumbers = [
        'responseSamples',
        'confirmationSamples',
        'confirmationRatePercent',
        'bookingCount',
        'cancelCount',
        'noShowCount',
        'duplicateSubmissionChecks',
        'duplicateRequestsCreated',
    ]
    const numbersValid = requiredNumbers.every((field) => finiteNonNegative(metrics[field]))
    const p50Valid = metrics.responseP50Minutes === null || finiteNonNegative(metrics.responseP50Minutes)
    const p95Valid = metrics.responseP95Minutes === null || finiteNonNegative(metrics.responseP95Minutes)
    const rateValid = finiteNonNegative(metrics.confirmationRatePercent) && Number(metrics.confirmationRatePercent) <= 100
    if (numbersValid && p50Valid && p95Valid && rateValid) checks.push(pass('Pilot metrics shape', 'response, booking, cancellation, no-show and duplicate metrics are numeric'))
    else checks.push(blocked('Pilot metrics shape', 'all required metrics must be finite non-negative values and rates must be 0–100'))

    if (Number(metrics.responseSamples) >= 5 && finiteNonNegative(metrics.responseP95Minutes)) checks.push(pass('Response-time evidence', `${metrics.responseSamples} samples with p95 response time`))
    else checks.push(blocked('Response-time evidence', 'at least five response samples and a measured p95 are required'))

    if (Number(metrics.confirmationSamples) >= 5 && Number(metrics.bookingCount) > 0) checks.push(pass('Booking reliability evidence', `${metrics.confirmationSamples} confirmation samples across ${metrics.bookingCount} bookings`))
    else checks.push(blocked('Booking reliability evidence', 'at least five confirmation samples and one booking are required'))

    if (Number(metrics.duplicateSubmissionChecks) >= 1 && Number(metrics.duplicateRequestsCreated) === 0) checks.push(pass('Idempotency evidence', 'duplicate submission check completed without creating a duplicate request'))
    else checks.push(blocked('Idempotency evidence', 'run at least one duplicate submission check and create zero duplicate requests'))

    if (Number(metrics.cancelCount) >= 0 && Number(metrics.noShowCount) >= 0) checks.push(pass('Cancellation and no-show evidence', 'cancellation and no-show counters are recorded'))
    else checks.push(blocked('Cancellation and no-show evidence', 'cancellation and no-show counters are required'))

    return checks
}

export function evaluatePilotEvidence(input: unknown): PilotEvidenceCheck[] {
    if (!isRecord(input)) return [blocked('Evidence document', 'JSON root must be an object')]
    const typed = input as PilotEvidenceInput
    const checks: PilotEvidenceCheck[] = []

    if (typed.schemaVersion === 1 && typed.source === 'real' && ['staging', 'production'].includes(String(typed.environment))) checks.push(pass('Evidence provenance', `${typed.environment} evidence marked as real`))
    else checks.push(blocked('Evidence provenance', 'only schemaVersion 1 documents marked source=real for staging or production are accepted'))

    if (typeof typed.marketId === 'string' && typed.marketId.trim().length > 0 && typeof typed.collectedAt === 'string' && Number.isFinite(Date.parse(typed.collectedAt))) checks.push(pass('Market and timestamp', `market ${typed.marketId} with a valid collection timestamp`))
    else checks.push(blocked('Market and timestamp', 'marketId and a valid collectedAt timestamp are required'))

    checks.push(...validateParticipants(typed), ...validateJourneys(typed), ...validateMetrics(typed))

    const privacy: Record<string, unknown> = isRecord(typed.privacy) ? typed.privacy : {}
    const piiPath = findPiiPath(input)
    if (piiPath) checks.push(blocked('Privacy evidence', `PII-like field detected at ${piiPath}; remove it before submitting evidence`))
    else if (privacy.piiRedacted === true && finiteNonNegative(privacy.evidenceRetentionDays) && Number(privacy.evidenceRetentionDays) > 0) checks.push(pass('Privacy evidence', 'PII is redacted and a retention period is recorded'))
    else checks.push(blocked('Privacy evidence', 'PII must be redacted and evidenceRetentionDays must be positive'))

    return checks
}

export function formatPilotEvidenceReport(checks: PilotEvidenceCheck[]): string {
    const lines = ['AutoCare Hub real pilot evidence gate']
    for (const check of checks) lines.push(`[${check.status.toUpperCase()}] ${check.name}: ${check.detail}`)
    const blockedCount = checks.filter((check) => check.status === 'blocked').length
    lines.push(`Result: ${blockedCount === 0 ? 'real pilot evidence accepted' : `blocked by ${blockedCount} pilot gate(s)`}.`)
    return lines.join('\n')
}
