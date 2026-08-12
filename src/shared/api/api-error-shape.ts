export type ApiErrorData = {
    code?: string
}

export function parseApiErrorData(value: unknown): ApiErrorData | undefined {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return undefined
    }

    const code = Reflect.get(value, 'code')

    return typeof code === 'string' ? { code } : {}
}
