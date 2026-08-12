export const MAX_EXTERNAL_ERROR_CONTEXT_KEYS = 32

export function boundExternalErrorContext(context: Record<string, unknown>) {
    return Object.fromEntries(Object.entries(context).slice(0, MAX_EXTERNAL_ERROR_CONTEXT_KEYS))
}
