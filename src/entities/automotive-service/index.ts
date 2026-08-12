export {
    automotiveServices,
    getServiceLabel,
    getProviderProfile,
    providerProfiles,
    providerPreviews,
    type AutomotiveService,
    type ProviderOffering,
    type ProviderProfile,
    type ProviderPreview,
    type ProviderReview,
} from './model/autocareMockData'
export {
    useGetAutoCareDiscoveryQuery,
    useGetAutoCareMarketsQuery,
    useGetAutoCareProviderProfileQuery,
    useGetAutoCareServiceDefinitionsQuery,
} from './api/autocareApi'
export type {
    AutoCareApiDiscoveryItem,
    AutoCareApiDiscoveryResponse,
    AutoCareApiMarket,
    AutoCareApiOffer,
    AutoCareApiProvider,
    AutoCareApiProviderProfile,
    AutoCareApiServiceDefinition,
    AutoCareDiscoveryQuery,
} from './api/autocareApi'
export { mapAutoCareDiscoveryItem, mapAutoCareProviderProfile } from './lib/autocareApiMappers'
