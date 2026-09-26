type AutoCareMarket = { id: string; launchReady: boolean }
type AutoCareDiscoveryPage = {
    items: { provider: { id: string } }[]
    nextCursor: string | null
}

const pageSize = 50
const maxMarkets = 100
const maxPagesPerMarket = 1_000
const maxSitemapProviders = 49_989

function getApiOrigin() {
    return new URL(process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://127.0.0.1:4000')
}

async function fetchJson<T>(url: URL): Promise<T | null> {
    try {
        const response = await fetch(url, { next: { revalidate: 300 }, signal: AbortSignal.timeout(5_000) })
        if (!response.ok) return null
        return await response.json() as T
    } catch {
        return null
    }
}

export async function getPublicAutoCareProviderIds(prerenderProviderIds = process.env.NEXT_PUBLIC_PRERENDER_PROVIDER_IDS ?? '') {
    const apiOrigin = getApiOrigin()
    const markets = await fetchJson<AutoCareMarket[]>(new URL('/v1/markets', apiOrigin))
    const providerIds = new Set(
        prerenderProviderIds
            .split(',')
            .map((providerId) => providerId.trim())
            .filter((providerId) => /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(providerId)),
    )
    if (!Array.isArray(markets)) return [...providerIds]

    for (const market of markets.filter((item) => item.launchReady).slice(0, maxMarkets)) {
        let cursor: string | null = null
        for (let pageNumber = 0; pageNumber < maxPagesPerMarket && providerIds.size < maxSitemapProviders; pageNumber += 1) {
            const discoveryUrl = new URL('/v1/discovery/providers', apiOrigin)
            discoveryUrl.searchParams.set('marketId', market.id)
            discoveryUrl.searchParams.set('radiusKm', '500')
            discoveryUrl.searchParams.set('limit', String(pageSize))
            if (cursor) discoveryUrl.searchParams.set('cursor', cursor)

            const page = await fetchJson<AutoCareDiscoveryPage>(discoveryUrl)
            if (!page || !Array.isArray(page.items)) break
            for (const item of page.items) {
                if (typeof item?.provider?.id === 'string') providerIds.add(item.provider.id)
            }
            cursor = page.nextCursor
            if (!cursor || page.items.length === 0) break
        }
        if (providerIds.size >= maxSitemapProviders) break
    }

    return [...providerIds]
}
