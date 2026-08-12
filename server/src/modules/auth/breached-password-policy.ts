export type BreachedPasswordCheckMode = 'off' | 'shadow' | 'enforce'

export function resolveBreachedPasswordCheckMode(input: {
    nodeEnv: string
    configuredMode?: string
}): BreachedPasswordCheckMode {
    const configured = input.configuredMode?.trim().toLowerCase()
    if (configured === 'off' || configured === 'shadow' || configured === 'enforce') {
        return configured
    }
    return input.nodeEnv === 'production' ? 'shadow' : 'off'
}

export function getBreachedPasswordClientPolicy(mode: BreachedPasswordCheckMode) {
    return {
        mode,
        timeoutMs: mode === 'off' ? 0 : 3_000,
        failClosed: mode === 'enforce',
    } as const
}
