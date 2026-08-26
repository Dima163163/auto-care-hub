export type QueryViewState =
    | 'loading'
    | 'empty'
    | 'success'
    | 'refreshing'
    | 'error'
    | 'stale-error'
    | 'offline'
    | 'permission-denied'
    | 'suspended'
    | 'partial'
    | 'session-expired'

export type QueryViewStateInput = {
    isLoading: boolean
    isFetching: boolean
    isError: boolean
    hasData: boolean
    hasResults: boolean
    isOffline?: boolean
    isPermissionDenied?: boolean
    isSuspended?: boolean
    isStale?: boolean
    isPartial?: boolean
    isSessionExpired?: boolean
}

export function resolveQueryViewState({
    isLoading,
    isFetching,
    isError,
    hasData,
    hasResults,
    isOffline = false,
    isPermissionDenied = false,
    isSuspended = false,
    isStale = false,
    isPartial = false,
    isSessionExpired = false,
}: QueryViewStateInput): QueryViewState {
    if (isSessionExpired) {
        return 'session-expired'
    }

    if (isPermissionDenied) {
        return 'permission-denied'
    }

    if (isSuspended) {
        return 'suspended'
    }

    if (isOffline && !hasData) {
        return 'offline'
    }

    if (isStale) {
        return 'stale-error'
    }

    if (isError) {
        return hasResults ? 'stale-error' : 'error'
    }

    if (isPartial) {
        return 'partial'
    }

    if (isLoading || (isFetching && !hasData)) {
        return 'loading'
    }

    if (!hasResults) {
        return 'empty'
    }

    if (isFetching) {
        return 'refreshing'
    }

    return 'success'
}
