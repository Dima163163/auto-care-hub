import { CabinetStatus } from '../../entities/cabinet/cabinet.entity.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const STATUSES = new Set<string>(Object.values(CabinetStatus))

export function normalizeAdminCabinetUuid(value: unknown) {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim().toLowerCase()
    return UUID_PATTERN.test(normalized) ? normalized : null
}

export function normalizeAdminCabinetStatus(value: unknown) {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim().toLowerCase()
    return STATUSES.has(normalized) ? normalized as CabinetStatus : null
}
