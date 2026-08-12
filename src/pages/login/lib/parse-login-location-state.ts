export type LoginRedirectLocation = {
    pathname: string
    search: string
    hash: string
}

export type LoginLocationState = {
    from?: LoginRedirectLocation
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

export function parseLoginLocationState(value: unknown): LoginLocationState {
    if (!isRecord(value) || !isRecord(value.from)) {
        return {}
    }

    const { pathname, search, hash } = value.from

    if (typeof pathname !== 'string') {
        return {}
    }

    return {
        from: {
            pathname,
            search: typeof search === 'string' ? search : '',
            hash: typeof hash === 'string' ? hash : '',
        },
    }
}
