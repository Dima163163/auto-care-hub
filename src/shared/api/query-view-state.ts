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
}: QueryViewStateInput): QueryViewState {
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
