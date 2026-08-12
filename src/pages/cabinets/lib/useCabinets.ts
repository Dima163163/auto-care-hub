import { useEffect, useRef, useState } from 'react'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { useInView } from 'react-intersection-observer'
import { useSearchParams } from 'react-router'
import { z } from 'zod'

import { useGetCabinetsQuery } from '@/entities/cabinet'
import type { GetCabinetsRequest } from '@/entities/cabinet/api/cabinetsApi'
import { useTranslation } from '@/shared/lib/useTranslation'

export type CabinetSortOption = {
    label: string
    value: NonNullable<GetCabinetsRequest['sortBy']>
}

export type CabinetFilterState = {
    city: string
    category: string
    minPrice: string
    maxPrice: string
    minRating: string
    service: string
    availableToday: boolean
    date: string
    duration: string
}

const EMPTY_FILTERS: CabinetFilterState = {
    city: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    minRating: '',
    service: '',
    availableToday: false,
    date: '',
    duration: '',
}

const cabinetSortOptionSchema = z.enum([
    'price_asc',
    'price_desc',
    'newest',
    'popular',
])

const cabinetSortOptionValues = new Set(cabinetSortOptionSchema.options)
const availabilityDurationSchema = z.enum(['30', '60', '90', '120'])

function getDateFilter(params: URLSearchParams) {
    const value = params.get('date')

    return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''
}

function getDurationFilter(params: URLSearchParams) {
    const result = availabilityDurationSchema.safeParse(params.get('duration'))

    return result.success ? result.data : ''
}

function getNumericFilter(params: URLSearchParams, key: string, min: number, max?: number) {
    const value = params.get(key)
    const numberValue = value === null ? NaN : Number(value)

    if (!value || !Number.isFinite(numberValue) || numberValue < min) return ''
    if (max !== undefined && numberValue > max) return ''

    return value
}

export function isCabinetSortOptionValue(
    value: string,
): value is CabinetSortOption['value'] {
    return cabinetSortOptionValues.has(value as CabinetSortOption['value'])
}

export function getCabinetFiltersFromSearchParams(params: URLSearchParams) {
    const sortByResult = cabinetSortOptionSchema.safeParse(params.get('sortBy'))

    return {
        search: params.get('search') ?? '',
        sortBy: sortByResult.success ? sortByResult.data : 'newest' as const,
        filters: {
            city: params.get('city') ?? '',
            category: params.get('category') ?? '',
            minPrice: getNumericFilter(params, 'minPrice', 0),
            maxPrice: getNumericFilter(params, 'maxPrice', 0),
            minRating: getNumericFilter(params, 'minRating', 1, 5),
            service: params.get('service') ?? '',
            availableToday: params.get('availableToday') === 'true',
            date: getDateFilter(params),
            duration: getDurationFilter(params),
        },
    }
}

function isNetworkError(error: unknown): error is FetchBaseQueryError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        error.status === 'FETCH_ERROR'
    )
}

export function useCabinets() {
    const { t } = useTranslation()
    const [searchParams, setSearchParams] = useSearchParams()
    const initialState = getCabinetFiltersFromSearchParams(searchParams)
    const [searchInput, setSearchInput] = useState(initialState.search)
    const [debouncedSearch, setDebouncedSearch] = useState(initialState.search)
    const [sortBy, setSortBy] = useState<GetCabinetsRequest['sortBy']>(initialState.sortBy)
    const [filters, setFilters] = useState<CabinetFilterState>(initialState.filters)
    const [page, setPage] = useState(1)

    useEffect(() => {
        const handler = setTimeout(() => {
            const nextSearch = searchInput.trim()
            setDebouncedSearch(nextSearch)
            setPage(1)
            setSearchParams((currentParams) => {
                const nextParams = new URLSearchParams(currentParams)

                if (nextSearch) nextParams.set('search', nextSearch)
                else nextParams.delete('search')

                if (sortBy && sortBy !== 'newest') nextParams.set('sortBy', sortBy)
                else nextParams.delete('sortBy')

                if (filters.city.trim()) nextParams.set('city', filters.city.trim())
                else nextParams.delete('city')
                if (filters.category) nextParams.set('category', filters.category)
                else nextParams.delete('category')
                if (filters.minPrice) nextParams.set('minPrice', filters.minPrice)
                else nextParams.delete('minPrice')
                if (filters.maxPrice) nextParams.set('maxPrice', filters.maxPrice)
                else nextParams.delete('maxPrice')
                if (filters.minRating) nextParams.set('minRating', filters.minRating)
                else nextParams.delete('minRating')
                if (filters.service.trim()) nextParams.set('service', filters.service.trim())
                else nextParams.delete('service')
                if (filters.availableToday) nextParams.set('availableToday', 'true')
                else nextParams.delete('availableToday')
                if (filters.date) nextParams.set('date', filters.date)
                else nextParams.delete('date')
                if (filters.duration) nextParams.set('duration', filters.duration)
                else nextParams.delete('duration')

                return nextParams
            }, { replace: true })
        }, 500)

        return () => clearTimeout(handler)
    }, [filters, searchInput, setSearchParams, sortBy])

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const nextState = getCabinetFiltersFromSearchParams(searchParams)

            setSearchInput(nextState.search)
            setDebouncedSearch(nextState.search)
            setSortBy(nextState.sortBy)
            setFilters(nextState.filters)
            setPage(1)
        }, 0)

        return () => clearTimeout(timeoutId)
    }, [searchParams])

    const numericFilter = (value: string) => {
        const parsedValue = Number(value)
        return value && Number.isFinite(parsedValue) ? parsedValue : undefined
    }

    const {
        data,
        isLoading,
        isFetching,
        isError,
        error,
        refetch,
    } = useGetCabinetsQuery({
        search: debouncedSearch || undefined,
        sortBy,
        city: filters.city.trim() || undefined,
        category: filters.category || undefined,
        minPrice: numericFilter(filters.minPrice),
        maxPrice: numericFilter(filters.maxPrice),
        minRating: numericFilter(filters.minRating),
        service: filters.service.trim() || undefined,
        availableToday: filters.availableToday || undefined,
        availabilityDate: filters.date || undefined,
        durationMinutes: numericFilter(filters.duration),
        page,
        limit: 6,
    })

    const networkRetryCount = useRef(0)

    useEffect(() => {
        networkRetryCount.current = 0
    }, [debouncedSearch, filters, page, sortBy])

    useEffect(() => {
        if (!isError) return
        if (!isNetworkError(error) || networkRetryCount.current >= 2) return

        networkRetryCount.current += 1
        const timeoutId = window.setTimeout(
            () => void refetch(),
            networkRetryCount.current * 1_000,
        )

        return () => window.clearTimeout(timeoutId)
    }, [error, isError, refetch])

    const cabinets = data?.items || []
    const total = data?.total ?? cabinets.length
    const totalPages = data?.totalPages || 0

    const { ref } = useInView({
        threshold: 0,
        rootMargin: '100px',
        onChange: (isInView) => {
            if (isInView && !isFetching && page < totalPages) {
                setPage((previousPage) => previousPage + 1)
            }
        },
    })

    const handleSortChange = (newSort: CabinetSortOption['value']) => {
        setSortBy(newSort)
        setPage(1)
    }

    const handleFilterChange = <T extends keyof CabinetFilterState>(
        key: T,
        value: CabinetFilterState[T],
    ) => {
        setFilters((currentFilters) => ({
            ...currentFilters,
            [key]: value,
        }))
        setPage(1)
    }

    const clearFilters = () => {
        setSearchInput('')
        setDebouncedSearch('')
        setSortBy('newest')
        setFilters(EMPTY_FILTERS)
        setPage(1)
        setSearchParams({}, { replace: true })
    }

    const sortOptions: CabinetSortOption[] = [
        { value: 'newest', label: t('cabinet.publicList.sortNewest') },
        { value: 'popular', label: t('cabinet.publicList.sortPopular') },
        { value: 'price_asc', label: t('cabinet.publicList.sortPriceAsc') },
        { value: 'price_desc', label: t('cabinet.publicList.sortPriceDesc') },
    ]

    const hasAdvancedFilters = Object.values(filters).some((value) => Boolean(value))

    return {
        searchInput,
        setSearchInput,
        sortBy,
        handleSortChange,
        filters,
        handleFilterChange,
        clearFilters,
        hasAdvancedFilters,
        cabinets,
        total,
        isLoading,
        isFetching,
        isError,
        error,
        refetch,
        page,
        totalPages,
        loadMoreRef: ref,
        sortOptions,
    }
}
