import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, LayoutGrid, List, Map as MapIcon } from 'lucide-react'
import { FavoriteCabinetCard } from '@/features/favorites'
import { useGetMeQuery } from '@/features/auth'
import {
    useRecordClientExperimentEventMutation,
    type ClientExperimentEventName,
} from '@/features/experiments/api/clientExperimentApi'
import type { Cabinet } from '@/entities/cabinet'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/shared/lib/useTranslation'
import { Dropdown } from '@/shared/ui/dropdown/Dropdown'
import { CabinetMapPanel } from '@/widgets/cabinet-map'
import { isCabinetSortOptionValue, useCabinets } from '../lib/useCabinets'
import { CabinetsHeader } from './CabinetsHeader'
import { CabinetsFilters } from './CabinetsFilters'
import {
    CabinetsEmpty,
    CabinetsError,
    CabinetsStaleError,
    CabinetsFetchingNext,
    CabinetsLoading,
} from './CabinetsStates'

type CatalogViewMode = 'split' | 'list' | 'map'

export function CabinetsPage() {
    const { t } = useTranslation()
    const { data: currentUser } = useGetMeQuery()
    const [recordClientEvent] = useRecordClientExperimentEventMutation()
    const searchTelemetryTimeout = useRef<number | undefined>(undefined)
    const noResultsSignature = useRef<string | undefined>(undefined)
    const [selectedCabinetId, setSelectedCabinetId] = useState<string | undefined>()
    const [isSelectionCleared, setIsSelectionCleared] = useState(false)
    const [viewMode, setViewMode] = useState<CatalogViewMode>('split')
    const {
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
        loadMoreRef,
        sortOptions,
    } = useCabinets()

    const recordCatalogEvent = useCallback((event: ClientExperimentEventName) => {
        if (currentUser?.role !== 'client') return

        void recordClientEvent({ event }).unwrap().catch(() => undefined)
    }, [currentUser?.role, recordClientEvent])

    useEffect(() => () => {
        if (searchTelemetryTimeout.current !== undefined) {
            window.clearTimeout(searchTelemetryTimeout.current)
        }
    }, [])

    const isInitialLoading = isLoading || (isFetching && page === 1 && cabinets.length === 0)
    const hasActiveFilters = Boolean(searchInput.trim()) || hasAdvancedFilters || sortBy !== 'newest'
    const hasDiscoveryCriteria = Boolean(searchInput.trim()) || hasAdvancedFilters
    const discoveryStateSignature = JSON.stringify({ searchInput: searchInput.trim(), filters })

    useEffect(() => {
        if (
            isInitialLoading ||
            isError ||
            cabinets.length > 0 ||
            !hasDiscoveryCriteria ||
            noResultsSignature.current === discoveryStateSignature
        ) {
            return
        }

        noResultsSignature.current = discoveryStateSignature
        recordCatalogEvent('catalog_no_results')
    }, [
        cabinets.length,
        discoveryStateSignature,
        hasDiscoveryCriteria,
        isError,
        isInitialLoading,
        recordCatalogEvent,
    ])

    const displayedSelectedCabinetId = selectedCabinetId ?? (isSelectionCleared ? undefined : cabinets[0]?.id)

    const handleCabinetSelect = (cabinet: Cabinet) => {
        setSelectedCabinetId(cabinet.id)
        setIsSelectionCleared(false)
    }

    const scheduleCatalogFilterUsed = () => {
        if (searchTelemetryTimeout.current !== undefined) {
            window.clearTimeout(searchTelemetryTimeout.current)
        }

        searchTelemetryTimeout.current = window.setTimeout(() => {
            recordCatalogEvent('catalog_filter_used')
        }, 600)
    }

    const handleSearchInput = (value: string) => {
        setSearchInput(value)
        if (value.trim()) scheduleCatalogFilterUsed()
    }

    const handleCatalogFilterChange = <T extends keyof typeof filters>(
        key: T,
        value: (typeof filters)[T],
    ) => {
        handleFilterChange(key, value)
        scheduleCatalogFilterUsed()
    }

    const handleCatalogSortChange = (value: Parameters<typeof handleSortChange>[0]) => {
        handleSortChange(value)
        scheduleCatalogFilterUsed()
    }

    const handleClearFilters = () => {
        if (searchTelemetryTimeout.current !== undefined) {
            window.clearTimeout(searchTelemetryTimeout.current)
        }
        if (hasActiveFilters) recordCatalogEvent('catalog_filter_reset')
        clearFilters()
    }

    const setCatalogViewMode = (mode: CatalogViewMode) => {
        setViewMode(mode)
    }

    return (
        <main className="min-h-screen bg-background px-4 py-10 xl:px-0 xl:py-0">
            <section
                aria-busy={isInitialLoading || isFetching}
                className="mx-auto max-w-6xl xl:max-w-[1440px]"
            >
                <div className="xl:px-10 xl:pt-6">
                    <CabinetsHeader />

                    <CabinetsFilters
                        searchInput={searchInput}
                        setSearchInput={handleSearchInput}
                        sortBy={sortBy}
                        onSortChange={handleCatalogSortChange}
                        sortOptions={sortOptions}
                        filters={filters}
                        onFilterChange={handleCatalogFilterChange}
                        onClearFilters={handleClearFilters}
                        hasAdvancedFilters={hasAdvancedFilters}
                    />
                </div>

                {isInitialLoading && <CabinetsLoading />}

                {isError && cabinets.length === 0 && (
                    <CabinetsError error={error} onRetry={refetch} />
                )}

                {isError && cabinets.length > 0 && (
                    <CabinetsStaleError error={error} onRetry={refetch} />
                )}

                {!isInitialLoading && !isError && cabinets.length === 0 && (
                    <CabinetsEmpty
                        hasActiveFilters={hasActiveFilters}
                        onClearFilters={handleClearFilters}
                    />
                )}

                {!isInitialLoading && cabinets.length > 0 && (
                    <div className={cn(
                        'flex flex-col md:border-t xl:grid xl:grid-cols-[minmax(0,0.92fr)_minmax(460px,1.08fr)] xl:items-stretch',
                        viewMode !== 'split' && 'xl:grid-cols-1',
                    )}>
                        <div className={cn(
                            'order-2 min-w-0 md:px-4 md:py-6 xl:order-none xl:px-10 xl:py-6 xl:pr-8',
                            viewMode === 'map' && 'xl:hidden',
                        )}>
                            <div className="mb-5 flex items-end justify-between gap-4">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">{t('cabinet.publicList.resultsEyebrow')}</p>
                                    <h2 className="mt-2 text-2xl font-black tracking-tight">{t('cabinet.publicList.resultsTitle')}</h2>
                                </div>
                                <div className="hidden flex-wrap items-center justify-end gap-3 xl:flex">
                                    <Dropdown
                                        align="right"
                                        value={sortBy}
                                        onSelect={(value) => {
                                            if (isCabinetSortOptionValue(value)) handleSortChange(value)
                                        }}
                                        items={sortOptions}
                                        trigger={(triggerProps) => (
                                            <button
                                                {...triggerProps}
                                                type="button"
                                                className="flex h-9 min-w-[150px] items-center justify-between rounded-md border bg-card px-3 text-xs font-bold outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
                                            >
                                                <span className="mr-2 truncate">
                                                    {t('cabinet.publicList.sortBy')}: {sortOptions.find((option) => option.value === sortBy)?.label}
                                                </span>
                                                <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                                            </button>
                                        )}
                                    />
                                    <div className="flex items-center gap-1 rounded-md border bg-card p-1 text-xs font-bold" role="group" aria-label={t('cabinet.publicList.viewMode')}>
                                        <button
                                            type="button"
                                            aria-pressed={viewMode === 'split'}
                                            onClick={() => setCatalogViewMode('split')}
                                            className={cn(
                                                'flex h-8 items-center gap-1 rounded px-3 transition-colors',
                                                viewMode === 'split' ? 'text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                            )}
                                        >
                                            <LayoutGrid className="size-3.5" />
                                            {t('cabinet.publicList.splitView')}
                                        </button>
                                        <button
                                            type="button"
                                            aria-pressed={viewMode === 'list'}
                                            onClick={() => setCatalogViewMode('list')}
                                            className={cn(
                                                'flex h-8 items-center gap-1 rounded px-3 transition-colors',
                                                viewMode === 'list' ? 'text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                            )}
                                        >
                                            <List className="size-3.5" />
                                            {t('cabinet.publicList.listView')}
                                        </button>
                                        <button
                                            type="button"
                                            aria-pressed={viewMode === 'map'}
                                            onClick={() => setCatalogViewMode('map')}
                                            className={cn(
                                                'flex h-8 items-center gap-1 rounded px-3 transition-colors',
                                                viewMode === 'map' ? 'text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                            )}
                                        >
                                            <MapIcon className="size-3.5" />
                                            {t('cabinet.publicList.mapView')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <p className="mb-4 text-sm font-semibold text-muted-foreground">{t('cabinet.publicList.resultsCount', { count: total })}</p>
                            <div className="autocarehub-motion-fade-in grid gap-4 mb-8"
                        >
                            {cabinets.map((cabinet) => (
                                <div
                                    key={cabinet.id}
                                    className="autocarehub-motion-list-item"
                                >
                                    <FavoriteCabinetCard
                                        cabinet={cabinet}
                                        layout="row"
                                        onSelect={handleCabinetSelect}
                                        onOpenDetails={hasDiscoveryCriteria
                                            ? () => recordCatalogEvent('catalog_search_to_detail')
                                            : undefined}
                                        detailsFrom={hasDiscoveryCriteria ? 'filtered-catalog' : undefined}
                                    />
                                </div>
                            ))}
                            </div>

                            {page < totalPages && (
                                <div ref={loadMoreRef} className="mt-8 flex justify-center py-6">
                                    {isFetching && <CabinetsFetchingNext />}
                                </div>
                            )}
                        </div>
                        <div className={cn(
                            'xl:self-stretch',
                            viewMode === 'list' && 'xl:hidden',
                        )}>
                            <CabinetMapPanel
                                cabinets={cabinets}
                                selectedCabinetId={displayedSelectedCabinetId}
                                onSelect={handleCabinetSelect}
                                onClear={() => {
                                    setSelectedCabinetId(undefined)
                                    setIsSelectionCleared(true)
                                }}
                                onBackToList={viewMode === 'map' ? () => setCatalogViewMode('split') : undefined}
                            />
                        </div>
                    </div>
                )}
            </section>
        </main>
    )
}
