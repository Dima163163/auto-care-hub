import { AutoCareHero } from './AutoCareHero'
import { HomeDiscoveryGrid } from './HomeDiscoveryGrid'
import { HomeProcessSection } from './HomeProcessSection'
import { HomeReviewsSection } from './HomeReviewsSection'
import { ProviderPreviewSection } from './ProviderPreviewSection'

export function AutoCareHomePage() {
    return (
        <>
            <AutoCareHero />
            <ProviderPreviewSection />
            <HomeDiscoveryGrid />
            <HomeProcessSection />
            <HomeReviewsSection />
        </>
    )
}
