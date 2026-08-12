import { baseApi } from '@/shared/api/baseApi'
import {
    normalizeOwnerReadiness,
    normalizeStripeConnectStatus,
    normalizeStripeOnboardingResponse,
} from '../lib/payment-response-schema'

export const paymentApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getOwnerReadiness: builder.query<ReturnType<typeof normalizeOwnerReadiness>, void>({
            query: () => '/owner/readiness',
            transformResponse: normalizeOwnerReadiness,
            providesTags: [{ type: 'OwnerReadiness', id: 'STATUS' }],
        }),
        getStripeConnectStatus: builder.query<{
            connected: boolean
            detailsSubmitted: boolean
            chargesEnabled: boolean
            payoutsEnabled: boolean
        }, void>({
            query: () => '/owner/stripe-connect/status',
            transformResponse: normalizeStripeConnectStatus,
            providesTags: [{ type: 'StripeConnect', id: 'STATUS' }],
        }),
        startStripeConnectOnboarding: builder.mutation<{ url: string }, void>({
            query: () => ({
                url: '/owner/stripe-connect/onboarding',
                method: 'POST',
            }),
            transformResponse: normalizeStripeOnboardingResponse,
            invalidatesTags: [{ type: 'StripeConnect', id: 'STATUS' }],
        }),
    }),
})

export const {
    useGetOwnerReadinessQuery,
    useGetStripeConnectStatusQuery,
    useStartStripeConnectOnboardingMutation,
} = paymentApi
