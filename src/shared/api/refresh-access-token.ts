import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'

export type RefreshOutcome =
    | { status: 'refreshed'; accessToken: string }
    | { status: 'rejected' }
    | { status: 'unavailable'; error: FetchBaseQueryError }

let inFlightRefresh: { generation: number; promise: Promise<RefreshOutcome> } | null = null

export function refreshAccessTokenSingleFlight(generation: number, request: () => Promise<RefreshOutcome>) {
    if (inFlightRefresh?.generation === generation) return inFlightRefresh.promise

    const promise = request().finally(() => {
        if (inFlightRefresh?.promise === promise) inFlightRefresh = null
    })
    inFlightRefresh = { generation, promise }
    return promise
}
