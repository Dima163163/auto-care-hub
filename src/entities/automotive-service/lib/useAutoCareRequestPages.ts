import { useMemo, useState } from 'react'

import { useGetMyAutoCareServiceRequestPageQuery, useGetOwnerAutoCareServiceRequestPageQuery } from '../api/autocareApi'
import type { AutoCareServiceRequest } from '../api/autocare/requests.types'

const PAGE_LIMIT = 50

/** Keeps only pages the person has requested while each API read stays bounded. */
export function useAutoCareRequestPages(kind: 'client' | 'owner') {
    const [cursor, setCursor] = useState<string | undefined>()
    const [previousItems, setPreviousItems] = useState<AutoCareServiceRequest[]>([])
    const args = { cursor, limit: PAGE_LIMIT }
    const options = { refetchOnMountOrArgChange: true }
    const clientQuery = useGetMyAutoCareServiceRequestPageQuery(args, { ...options, skip: kind !== 'client' })
    const ownerQuery = useGetOwnerAutoCareServiceRequestPageQuery(args, { ...options, skip: kind !== 'owner' })
    const query = kind === 'client' ? clientQuery : ownerQuery
    const page = query.currentData
    const data = useMemo(() => {
        const seen = new Set<string>()
        return [...previousItems, ...(page?.items ?? [])].filter((item) => {
            if (seen.has(item.id)) return false
            seen.add(item.id)
            return true
        })
    }, [page, previousItems])
    const loadMore = () => {
        if (!page?.nextCursor || query.isFetching) return
        setPreviousItems(data)
        setCursor(page.nextCursor)
    }
    const refetch = () => {
        if (cursor === undefined) return query.refetch()
        setPreviousItems([])
        setCursor(undefined)
    }
    return {
        data,
        hasMore: Boolean(page?.nextCursor),
        loadMore,
        refetch,
        isLoading: query.isLoading && data.length === 0,
        isFetching: query.isFetching,
        isError: query.isError,
        error: query.error,
    }
}
