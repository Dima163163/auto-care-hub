type QueryRefreshStatusProps = {
    isRefreshing: boolean
    label: string
}

export function QueryRefreshStatus({
    isRefreshing,
    label,
}: QueryRefreshStatusProps) {
    if (!isRefreshing) {
        return null
    }

    return (
        <p role="status" aria-live="polite" className="sr-only">
            {label}
        </p>
    )
}
