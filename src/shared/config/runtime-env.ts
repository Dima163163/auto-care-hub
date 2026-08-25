type RuntimeEnv = Record<string, string | undefined>

type ImportMetaWithEnv = ImportMeta & {
    env?: RuntimeEnv
}

function getViteEnv(): RuntimeEnv {
    return (import.meta as ImportMetaWithEnv).env ?? {}
}

function getNextEnv(): RuntimeEnv {
    if (typeof process === 'undefined') {
        return {}
    }

    // Next.js inlines direct `process.env.NEXT_PUBLIC_*` references during
    // the client build. Dynamic indexing is not guaranteed to be replaced,
    // so keep the small public allow-list explicit here.
    return {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_API_MODE: process.env.NEXT_PUBLIC_API_MODE,
        NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
        NEXT_PUBLIC_API_ORIGIN: process.env.NEXT_PUBLIC_API_ORIGIN,
        NEXT_PUBLIC_DEPLOYMENT_MARKET: process.env.NEXT_PUBLIC_DEPLOYMENT_MARKET,
        NEXT_PUBLIC_MAP_TILE_URL: process.env.NEXT_PUBLIC_MAP_TILE_URL,
        NEXT_PUBLIC_MAP_ATTRIBUTION: process.env.NEXT_PUBLIC_MAP_ATTRIBUTION,
        NEXT_PUBLIC_RESULTS_MAP_TILE_URL: process.env.NEXT_PUBLIC_RESULTS_MAP_TILE_URL,
        NEXT_PUBLIC_ENABLE_PROVIDER_PRICING: process.env.NEXT_PUBLIC_ENABLE_PROVIDER_PRICING,
        NEXT_PUBLIC_ENABLE_CHAT_NAVIGATION: process.env.NEXT_PUBLIC_ENABLE_CHAT_NAVIGATION,
        NEXT_PUBLIC_ENABLE_MSW: process.env.NEXT_PUBLIC_ENABLE_MSW,
        NEXT_PUBLIC_MSW_STRICT: process.env.NEXT_PUBLIC_MSW_STRICT,
    }
}

/** Reads the same public setting in both Vite and Next.js runtimes. */
export function readPublicEnv(
    viteKey: string,
    nextKey = viteKey.replace(/^VITE_/, 'NEXT_PUBLIC_'),
) {
    return getNextEnv()[nextKey] ?? getViteEnv()[viteKey]
}

export function isDevRuntime() {
    const nextMode = getNextEnv().NODE_ENV

    if (nextMode) {
        return nextMode !== 'production'
    }

    return getViteEnv().DEV === 'true'
}
