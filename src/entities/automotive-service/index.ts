export {
    automotiveServices,
    getServiceLabel,
    getProviderProfile,
    providerProfiles,
    providerPreviews,
    type AutomotivePriceType,
    type AutomotiveService,
    type ProviderOffering,
    type ProviderProfile,
    type ProviderPreview,
    type ProviderReview,
} from './model/autocareMockData'
export { automotiveVehicleBrands, getVehicleBrandLabel, type AutomotiveVehicleBrandId } from './model/vehicleBrands'
export { getVehicleModels } from './model/vehicleModels'
export {
    automotiveAmenities,
    defaultAutomotiveAmenityIds,
    getAutomotiveAmenityLabel,
    type AutomotiveAmenity,
    type AutomotiveAmenityId,
} from './model/automotiveAmenities'
export { AutomotiveAmenityIcon } from './ui/AutomotiveAmenityIcon'
export {
    useGetAutoCareDiscoveryQuery,
    useGetAutoCareMarketsQuery,
    useGetOwnerAutoCareProvidersQuery,
    useGetAutoCareProviderProfileQuery,
    useGetAutoCareServiceDefinitionsQuery,
    useCreateOwnerAutoCareProviderMutation,
    useCreateAutoCareServiceRequestMutation,
    useGetMyAutoCareServiceRequestsQuery,
    useGetAutoCareServiceRequestQuery,
    useConfirmAutoCareServiceRequestMutation,
    useAcceptAutoCareServiceQuoteMutation,
    useDeclineAutoCareServiceQuoteMutation,
    useGetOwnerAutoCareServiceRequestsQuery,
    useConfirmOwnerAutoCareServiceRequestMutation,
    useGetAutoCareServiceConversationQuery,
    useCreateAutoCareServiceMessageMutation,
    useCreateAutoCareServiceAttachmentMutation,
    useCreateAutoCareServiceQuoteMutation,
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
    CreateOwnerAutoCareProviderInput,
    AutoCareServiceRequest,
    CreateAutoCareServiceRequestInput,
    AutoCareServiceConversation,
    AutoCareServiceMessage,
    AutoCareServiceAttachment,
    CreateAutoCareServiceMessageInput,
    CreateAutoCareServiceAttachmentInput,
    CreateAutoCareServiceQuoteInput,
} from './api/autocareApi'
export { mapAutoCareDiscoveryItem, mapAutoCareProviderProfile } from './lib/autocareApiMappers'
export { supportsVehicleBrand } from './lib/brandSpecialization'
