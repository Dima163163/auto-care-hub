import { baseApi } from '@/shared/api/baseApi'
import { normalizeOwnerReadiness } from '../lib/payment-response-schema'

export const paymentApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getOwnerReadiness: builder.query<ReturnType<typeof normalizeOwnerReadiness>, void>({
            query: () => '/owner/readiness',
            transformResponse: normalizeOwnerReadiness,
            providesTags: [{ type: 'OwnerReadiness', id: 'STATUS' }],
        }),
    }),
})

export const {
    useGetOwnerReadinessQuery,
} = paymentApi
