type RefreshRequest = () => Promise<string | null>

let inFlightRefresh: Promise<string | null> | null = null

export function refreshAccessTokenSingleFlight(request: RefreshRequest) {
    inFlightRefresh ??= request().finally(() => {
        inFlightRefresh = null
    })

    return inFlightRefresh
}
