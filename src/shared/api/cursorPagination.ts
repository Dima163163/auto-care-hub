export type CursorPage<T> = {
    items: T[]
    nextCursor: string | null
}

export type CursorQuery = {
    cursor?: string | undefined
    limit?: number | undefined
}

export function getCursorQueryParams<T extends CursorQuery>(query: T) {
    return Object.fromEntries(
        Object.entries(query).filter(([, value]) => value !== undefined),
    )
}
