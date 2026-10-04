import { z } from 'zod'
import { adminAutoCareModerationEvidenceListSchema, adminAutoCareModerationEvidenceSchema, adminProviderSchema, autoCareAppealSchema, autoCareAppealsSchema, autoCarePriceBenchmarkSchema, autoCareQualityMonitoringSchema, autoCareTrustSchema, platformOverviewSchema, superAdminTrustPolicySchema } from './governance.schemas'
import type { AdminAutoCareModerationEvidence, AdminAutoCareProvider, AutoCareAppeal, AutoCarePriceBenchmark, AutoCareQualityMonitoring, AutoCareTrustResponse, CreateAutoCareAppealInput, SuperAdminPlatformOverview, SuperAdminTrustPolicy, UpdateSuperAdminTrustPolicyInput } from './governance.types'
import type { AutoCareApiProvider } from './providers.types'
import type { AutoCareEndpointBuilder } from './endpoint-builder'

export function createGovernanceEndpoints(build: AutoCareEndpointBuilder) {
    return {
getAutoCareFairPrice: build.query<AutoCarePriceBenchmark | null, { serviceId: string; marketId?: string; makeId?: string; modelId?: string; fuelType?: string; engineLiters?: number }>({
            query: (params) => ({ url: '/v1/fair-price', params }),
            transformResponse: (value: unknown) => value === null ? null : autoCarePriceBenchmarkSchema.parse(value),
            providesTags: [{ type: 'AutoCareMarketplace', id: 'PRICE' }],
        }),
getAutoCareProviderTrust: build.query<AutoCareTrustResponse, string>({
            query: (providerId) => `/v1/providers/${encodeURIComponent(providerId)}/trust`,
            transformResponse: (value: unknown) => autoCareTrustSchema.parse(value),
            providesTags: (_result, _error, providerId) => [{ type: 'AutoCareMarketplace', id: `TRUST_${providerId}` }],
        }),
getMyAutoCareAppeals: build.query<AutoCareAppeal[], void>({
            query: () => '/v1/autocare-appeals/my',
            transformResponse: (value: unknown) => autoCareAppealsSchema.parse(value),
            providesTags: [{ type: 'AutoCareReview', id: 'APPEALS' }],
        }),
createAutoCareAppeal: build.mutation<AutoCareAppeal, CreateAutoCareAppealInput>({
            query: (body) => ({ url: '/v1/autocare-appeals', method: 'POST', body }),
            transformResponse: (value: unknown) => autoCareAppealSchema.parse(value),
            invalidatesTags: (_result, _error, input) => [
                { type: 'AutoCareReview', id: 'APPEALS' },
                ...(input.subject === 'chat_restriction' ? [{ type: 'AutoCareServiceRequest' as const, id: 'CHAT_LIST' }] : []),
            ],
        }),
withdrawAutoCareAppeal: build.mutation<AutoCareAppeal, string>({
            query: (appealId) => ({ url: `/v1/autocare-appeals/${encodeURIComponent(appealId)}`, method: 'DELETE' }),
            transformResponse: (value: unknown) => autoCareAppealSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareReview', id: 'APPEALS' }, { type: 'AutoCareReview', id: 'ADMIN_APPEALS' }, { type: 'AutoCareProvider', id: 'QUALITY_MONITORING' }],
        }),
getAdminAutoCareProviders: build.query<AdminAutoCareProvider[], void>({
            query: () => '/admin/autocare-providers',
            transformResponse: (value: unknown) => z.array(adminProviderSchema).parse(value),
            providesTags: [{ type: 'AutoCareProvider', id: 'ADMIN_LIST' }],
        }),
updateAdminAutoCareProviderStatus: build.mutation<AdminAutoCareProvider, { id: string; status: AutoCareApiProvider['status'] }>({
            query: ({ id, status }) => ({ url: `/admin/autocare-providers/${id}/status`, method: 'PATCH', body: { status } }),
            transformResponse: (value: unknown) => adminProviderSchema.parse(value),
            invalidatesTags: (_result, _error, { id }) => [{ type: 'AutoCareProvider', id }, { type: 'AutoCareProvider', id: 'ADMIN_LIST' }],
        }),
getAdminAutoCareQualityMonitoring: build.query<AutoCareQualityMonitoring, void>({
            query: () => '/admin/autocare-quality-monitoring',
            transformResponse: (value: unknown) => autoCareQualityMonitoringSchema.parse(value),
            providesTags: [{ type: 'AutoCareProvider', id: 'QUALITY_MONITORING' }],
        }),
getAdminAutoCareAppeals: build.query<AutoCareAppeal[], { status?: AutoCareAppeal['status']; subject?: AutoCareAppeal['subject'] } | void>({
            query: (params) => ({ url: '/admin/autocare-appeals', params: params ?? undefined }),
            transformResponse: (value: unknown) => autoCareAppealsSchema.parse(value),
            providesTags: [{ type: 'AutoCareReview', id: 'ADMIN_APPEALS' }],
        }),
decideAdminAutoCareAppeal: build.mutation<AutoCareAppeal, { id: string; status: 'accepted' | 'rejected'; reason: string }>({
            query: ({ id, ...body }) => ({ url: `/admin/autocare-appeals/${encodeURIComponent(id)}/decision`, method: 'PATCH', body }),
            transformResponse: (value: unknown) => autoCareAppealSchema.parse(value),
            invalidatesTags: (result) => [
                { type: 'AutoCareReview', id: 'ADMIN_APPEALS' },
                { type: 'AutoCareProvider', id: 'QUALITY_MONITORING' },
                ...(result?.subject === 'chat_restriction' ? [{ type: 'AutoCareServiceRequest' as const, id: 'CHAT_LIST' }] : []),
            ],
        }),
getAdminAutoCareModerationEvidence: build.query<AdminAutoCareModerationEvidence[], { status?: AdminAutoCareModerationEvidence['status'] } | void>({
            query: (params) => ({ url: '/admin/autocare-moderation-evidence', params: params ?? undefined }),
            transformResponse: (value: unknown) => adminAutoCareModerationEvidenceListSchema.parse(value),
            providesTags: [{ type: 'AutoCareReview', id: 'MODERATION_EVIDENCE' }],
        }),
decideAdminAutoCareModerationEvidence: build.mutation<AdminAutoCareModerationEvidence, { id: string; status: 'approved' | 'rejected'; reason: string }>({
            query: ({ id, ...body }) => ({ url: `/admin/autocare-moderation-evidence/${encodeURIComponent(id)}/decision`, method: 'PATCH', body }),
            transformResponse: (value: unknown) => adminAutoCareModerationEvidenceSchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareReview', id: 'MODERATION_EVIDENCE' }, { type: 'AutoCareProvider', id: 'QUALITY_MONITORING' }, { type: 'AutoCareReview', id: 'FEATURED' }],
        }),
getSuperAdminPlatformOverview: build.query<SuperAdminPlatformOverview, void>({
            query: () => '/super-admin/platform-overview',
            transformResponse: (value: unknown) => platformOverviewSchema.parse(value),
            providesTags: [{ type: 'AutoCareProvider', id: 'PLATFORM_OVERVIEW' }],
        }),
getSuperAdminTrustPolicy: build.query<SuperAdminTrustPolicy, void>({
            query: () => '/super-admin/trust-policy',
            transformResponse: (value: unknown) => superAdminTrustPolicySchema.parse(value),
            providesTags: [{ type: 'AutoCareProvider', id: 'TRUST_POLICY' }],
        }),
updateSuperAdminTrustPolicy: build.mutation<SuperAdminTrustPolicy, UpdateSuperAdminTrustPolicyInput>({
            query: (body) => ({ url: '/super-admin/trust-policy', method: 'PATCH', body }),
            transformResponse: (value: unknown) => superAdminTrustPolicySchema.parse(value),
            invalidatesTags: [{ type: 'AutoCareProvider', id: 'TRUST_POLICY' }, { type: 'AutoCareProvider', id: 'QUALITY_MONITORING' }],
        })
    }
}
