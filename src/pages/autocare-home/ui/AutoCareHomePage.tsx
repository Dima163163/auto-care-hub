import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router'

import { AUTOCARE_MARKET_CHANGE_EVENT, readAutoCareMarketPreference, setAutoCareMarketPreference } from '@/shared/lib/market-preference'

import { AutoCareHero } from './AutoCareHero'
import { HomeDiscoveryGrid } from './HomeDiscoveryGrid'
import { HomeProcessSection } from './HomeProcessSection'
import { HomeReviewsSection } from './HomeReviewsSection'
import { ProviderPreviewSection } from './ProviderPreviewSection'

export function AutoCareHomePage() {
    const location = useLocation()
    const [marketId, setMarketId] = useState(() => readAutoCareMarketPreference(location.search))

    useEffect(() => {
        const syncMarket = () => setMarketId(readAutoCareMarketPreference(window.location.search))
        window.addEventListener(AUTOCARE_MARKET_CHANGE_EVENT, syncMarket)
        return () => window.removeEventListener(AUTOCARE_MARKET_CHANGE_EVENT, syncMarket)
    }, [])

    const handleMarketChange = useCallback((nextMarketId: string) => {
        setMarketId(nextMarketId)
        setAutoCareMarketPreference(nextMarketId)
    }, [])

    return (
        <>
            <AutoCareHero marketId={marketId} onMarketChange={handleMarketChange} />
            <ProviderPreviewSection />
            <HomeDiscoveryGrid marketId={marketId} />
            <HomeProcessSection />
            <HomeReviewsSection />
        </>
    )
}
