import { z } from 'zod'

import { baseApi } from '@/shared/api/baseApi'

export const clientExperimentEventNames = [
    'book_again_clicked',
    'preference_shortcut_used',
    'preference_shortcut_reset',
    'catalog_filter_used',
    'catalog_filter_reset',
    'catalog_search_to_detail',
    'catalog_search_to_book',
    'catalog_no_results',
] as const

export type ClientExperimentEventName = typeof clientExperimentEventNames[number]

type ClientExperimentEventResponse = {
    accepted: true
}

const clientExperimentEventResponseSchema = z.object({
    accepted: z.literal(true),
})

export const clientExperimentApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        recordClientExperimentEvent: build.mutation<ClientExperimentEventResponse, { event: ClientExperimentEventName }>({
            query: (body) => ({
                url: '/client/experiment-events',
                method: 'POST',
                body,
            }),
            transformResponse: (value: unknown): ClientExperimentEventResponse =>
                clientExperimentEventResponseSchema.parse(value),
        }),
    }),
})

export const { useRecordClientExperimentEventMutation } = clientExperimentApi
