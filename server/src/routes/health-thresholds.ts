export function parseHealthThreshold(
    value: string | undefined,
    fallback: number,
    maximum: number,
) {
    const parsed = value === undefined ? fallback : Number(value)
    if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > maximum) {
        throw new Error('Health threshold is invalid.')
    }

    return parsed
}
