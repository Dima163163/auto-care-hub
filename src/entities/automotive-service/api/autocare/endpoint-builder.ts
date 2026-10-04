import type { baseApi } from '@/shared/api/baseApi'

export type AutoCareEndpointBuilder = Parameters<Parameters<typeof baseApi.injectEndpoints>[0]['endpoints']>[0]
