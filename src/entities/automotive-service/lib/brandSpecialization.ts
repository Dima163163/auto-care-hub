import type { ProviderPreview } from '../model/autocareMockData'

export function supportsVehicleBrand(
    provider: Pick<ProviderPreview, 'brandSpecializations' | 'isMultibrand'>,
    brandId?: string,
) {
    return !brandId || provider.isMultibrand || provider.brandSpecializations.includes(brandId)
}
