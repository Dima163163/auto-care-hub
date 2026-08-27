import type { ReactNode } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import { AutoCareDiscoveryControls } from '@/features/autocare-search/ui/AutoCareDiscoveryControls'

import { LoadingRegion, SkeletonCard, SkeletonText } from './SkeletonPrimitives'

export function AutoCareResultsSkeleton({ label }: { label: string }) {
    return <LoadingRegion label={label}><ResultsLoadingSurface><AutoCareResultsSkeletonContent /></ResultsLoadingSurface></LoadingRegion>
}

/** Keep the discovery controls visible while the lazy route module is loading. */
export function AutoCareResultsRouteSkeleton({ label }: { label: string }) {
    return (
        <LoadingRegion label={label} contentAriaHidden={false} className="min-h-[min(720px,calc(100vh-9rem))] py-6 sm:py-10">
            <div className="-mt-6 sm:-mt-10">
                <section className="relative left-1/2 w-screen -translate-x-1/2 bg-hero-overlay text-primary-foreground">
                    <div className="mx-auto max-w-[var(--layout-public-wide-max)] px-[var(--layout-public-gutter)] py-5 sm:py-6">
                        <AutoCareDiscoveryControls
                            isLoading
                            activeFilters={[]}
                            brandId=""
                            filterPanel={null}
                            radiusKm={25}
                            serviceId=""
                            vehicleModel=""
                            vehicleYear=""
                            onRadiusChange={noop}
                            onRemoveFilter={noop}
                            onResetFilters={noop}
                            onServiceChange={noop}
                            onStartSearch={noop}
                            onVehicleChange={noop}
                            quickFilters={loadingQuickFilters}
                        />
                    </div>
                </section>
            </div>
            <div className="mx-auto w-full max-w-[var(--layout-public-wide-max)] px-[var(--layout-public-gutter)]">
                <ResultsLoadingSurface><AutoCareResultsSkeletonContent /></ResultsLoadingSurface>
            </div>
        </LoadingRegion>
    )
}

/** Keeps the server-dependent results area aligned with the loaded page surface. */
function ResultsLoadingSurface({ children }: { children: ReactNode }) {
    return <div className="autocare-results-loading-surface"><div className="autocare-results-loading-content">{children}</div></div>
}

function AutoCareResultsSkeletonContent() {
    return (
        <>
            <div className="space-y-2" aria-hidden="true">
                <Skeleton data-testid="autocare-results-title-skeleton" className="h-7 w-72 max-w-full" />
                <Skeleton data-testid="autocare-results-description-skeleton" className="h-4 w-[28rem] max-w-full" />
            </div>
            <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.04fr)_minmax(360px,0.76fr)]">
                <div className="order-2 grid gap-4 lg:order-1">
                    {Array.from({ length: 4 }, (_, index) => <ProviderCardSkeleton key={index} />)}
                </div>
                <div data-testid="autocare-results-map-skeleton" className="autocare-map-skeleton order-1 min-h-[420px] rounded-[var(--radius-panel)] border border-border lg:order-2 lg:min-h-[min(70vh,720px)]" />
            </div>
        </>
    )
}

const noop = () => undefined

const loadingQuickFilters = {
    isAvailableToday: false,
    isNearbyActive: false,
    isPriceActive: false,
    isRatingActive: false,
    onToggleAvailableToday: noop,
    onToggleNearby: noop,
    onTogglePrice: noop,
    onToggleRating: noop,
}

export function ProviderProfileSkeleton({ label }: { label: string }) {
    return (
        <LoadingRegion label={label}>
            <div className="bg-hero-overlay px-[var(--layout-gutter)] py-8 sm:py-12">
                <div className="mx-auto grid max-w-[var(--layout-operational-max)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)]">
                    <div className="space-y-5"><Skeleton className="h-7 w-40" /><Skeleton className="h-12 w-4/5" /><SkeletonText lines={3} className="max-w-md" /><Skeleton className="h-11 w-44" /></div>
                    <Skeleton className="min-h-56 w-full rounded-[var(--radius-panel)]" />
                </div>
            </div>
            <div className="mx-auto grid max-w-[var(--layout-operational-max)] gap-6 px-[var(--layout-gutter)] py-7 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="grid gap-6"><ProviderContentSkeleton /><ProviderContentSkeleton /><ProviderContentSkeleton /></div>
                <BookingPanelSkeleton />
            </div>
        </LoadingRegion>
    )
}

export function AutoCareRequestSkeleton({ label }: { label: string }) {
    return (
        <LoadingRegion label={label}>
            <div className="bg-hero-overlay px-[var(--layout-gutter)] py-8 sm:py-10"><div className="mx-auto max-w-[var(--layout-operational-max)] space-y-4"><Skeleton className="h-4 w-36" /><Skeleton className="h-10 w-72" /><Skeleton className="h-14 w-full rounded-[var(--radius-panel)]" /></div></div>
            <div className="mx-auto max-w-[var(--layout-operational-max)] px-[var(--layout-gutter)] py-6 sm:py-8"><ProviderContentSkeleton /><div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"><FormSkeleton /><BookingPanelSkeleton /></div></div>
        </LoadingRegion>
    )
}

export function ChatConversationSkeleton({ label }: { label: string }) {
    return (
        <LoadingRegion label={label} className="flex min-h-[620px] flex-col overflow-hidden rounded-[var(--radius-panel)] border border-border bg-card shadow-sm">
            <div className="flex items-center gap-3 border-b border-border px-5 py-4"><Skeleton className="size-10 rounded-[var(--radius-control)]" /><div className="grid gap-2"><Skeleton className="h-4 w-44" /><Skeleton className="h-3 w-28" /></div></div>
            <div className="flex-1 space-y-4 bg-secondary/50 p-5"><Skeleton className="h-16 w-3/4 rounded-[var(--radius-card)]" /><Skeleton className="ml-auto h-20 w-2/3 rounded-[var(--radius-card)]" /><Skeleton className="h-12 w-1/2 rounded-[var(--radius-card)]" /></div>
            <div className="flex items-center gap-2 border-t border-border p-4"><Skeleton className="size-10 rounded-[var(--radius-control)]" /><Skeleton className="h-11 flex-1 rounded-[var(--radius-control)]" /><Skeleton className="size-10 rounded-[var(--radius-control)]" /></div>
        </LoadingRegion>
    )
}

function ProviderCardSkeleton() {
    return <SkeletonCard className="min-h-52"><div className="flex gap-4"><Skeleton className="size-24 rounded-[var(--radius-card)]" /><div className="min-w-0 flex-1"><Skeleton className="h-5 w-2/5" /><SkeletonText lines={3} className="mt-3" /></div></div><div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4"><Skeleton className="h-4 w-28" /><Skeleton className="h-10 w-44 rounded-[var(--radius-control)]" /></div></SkeletonCard>
}

function ProviderContentSkeleton() {
    return <SkeletonCard><Skeleton className="h-6 w-44" /><SkeletonText lines={5} className="mt-5" /></SkeletonCard>
}

function BookingPanelSkeleton() {
    return <SkeletonCard className="h-fit"><Skeleton className="h-6 w-36" /><div className="mt-5 grid gap-3"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-11 w-full rounded-[var(--radius-control)]" /></div></SkeletonCard>
}

function FormSkeleton() {
    return <SkeletonCard><Skeleton className="h-6 w-48" /><div className="mt-5 grid gap-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-28 w-full" /><Skeleton className="h-12 w-full rounded-[var(--radius-control)]" /></div></SkeletonCard>
}
