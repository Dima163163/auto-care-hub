export type QueryViewState =
    | 'loading'
    | 'empty'
    | 'success'
    | 'refreshing'
    | 'error'
    | 'stale-error'
    | 'offline'
    | 'permission-denied'

export type QueryViewStateInput = {
    isLoading: boolean
    isFetching: boolean
    isError: boolean
    hasData: boolean
    hasResults: boolean
    isOffline?: boolean
    isPermissionDenied?: boolean
}

export function resolveQueryViewState({
    isLoading,
    isFetching,
    isError,
    hasData,
    hasResults,
    isOffline = false,
    isPermissionDenied = false,
}: QueryViewStateInput): QueryViewState {
    if (isPermissionDenied) {
        return 'permission-denied'
    }

    if (isOffline && !hasData) {
        return 'offline'
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
