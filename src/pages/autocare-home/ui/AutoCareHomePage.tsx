import { useState } from 'react'

import { AutoCareHero } from './AutoCareHero'
import { HomeDiscoveryGrid } from './HomeDiscoveryGrid'
import { HomeProcessSection } from './HomeProcessSection'
import { HomeReviewsSection } from './HomeReviewsSection'
import { ProviderPreviewSection } from './ProviderPreviewSection'

export function AutoCareHomePage() {
    const [marketId, setMarketId] = useState('moscow')

    return (
        <>
            <AutoCareHero marketId={marketId} onMarketChange={setMarketId} />
            <ProviderPreviewSection />
            <HomeDiscoveryGrid marketId={marketId} />
            <HomeProcessSection />
            <HomeReviewsSection />
        </>
    )
}
