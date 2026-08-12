export const RUNTIME_MODES = ['api', 'worker', 'all'] as const
export type RuntimeMode = (typeof RUNTIME_MODES)[number]

export function normalizeRuntimeMode(value: string | undefined): RuntimeMode {
    const normalized = value?.trim().toLowerCase() || 'all'
    if (!RUNTIME_MODES.includes(normalized as RuntimeMode)) {
        throw new Error('RUNTIME_MODE must be api, worker, or all.')
    }

    return normalized as RuntimeMode
}

export function shouldStartApi(mode: RuntimeMode) {
    return mode === 'api' || mode === 'all'
}

export function shouldStartWorker(mode: RuntimeMode) {
    return mode === 'worker' || mode === 'all'
}
