export type ManualBonusGrantValidation =
    | { valid: true; points: number; reason: string }
    | { valid: false; field: 'client' | 'points' | 'reason' }

export function validateManualBonusGrant(clientId: string, points: string, reason: string): ManualBonusGrantValidation {
    if (!clientId.trim()) return { valid: false, field: 'client' }

    const parsedPoints = Number(points)
    if (!Number.isInteger(parsedPoints) || parsedPoints < 1 || parsedPoints > 100_000) {
        return { valid: false, field: 'points' }
    }

    const normalizedReason = reason.trim()
    if (normalizedReason.length < 3 || normalizedReason.length > 240) {
        return { valid: false, field: 'reason' }
    }

    return { valid: true, points: parsedPoints, reason: normalizedReason }
}
