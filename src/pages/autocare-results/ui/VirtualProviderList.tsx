import { useCallback, useState, type UIEvent } from 'react'

import type { ProviderPreview } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'

import { ProviderResultCard } from './ProviderResultCard'

const INITIAL_PAGE_SIZE = 24
const PAGE_SIZE = 20
const ROW_HEIGHT = 286
const OVERSCAN_ROWS = 3

type VirtualProviderListProps = {
    providers: readonly ProviderPreview[]
    selectedIds: readonly string[]
    onToggle: (id: string) => void
    onFocus: (id: string) => void
}

/** Keeps a large result set inside its own scroll viewport. */
export function VirtualProviderList({ providers, selectedIds, onToggle, onFocus }: VirtualProviderListProps) {
    const { t } = useTranslation()
    const [loadedCount, setLoadedCount] = useState(() => Math.min(INITIAL_PAGE_SIZE, providers.length))
    const [scrollTop, setScrollTop] = useState(0)

    const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
        const viewport = event.currentTarget
        setScrollTop(viewport.scrollTop)

        if (viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - ROW_HEIGHT * 2) {
            setLoadedCount((current) => Math.min(current + PAGE_SIZE, providers.length))
        }
    }, [providers.length])

    const loadedProviders = providers.slice(0, loadedCount)
    const firstVisibleRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS)
    const visibleRowCount = Math.ceil(720 / ROW_HEIGHT) + OVERSCAN_ROWS * 2
    const lastVisibleRow = Math.min(loadedProviders.length, firstVisibleRow + visibleRowCount)
    const visibleProviders = loadedProviders.slice(firstVisibleRow, lastVisibleRow)

    return (
        <div
            className="h-[min(70dvh,680px)] min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain rounded-[var(--radius-card)] pr-1 [scrollbar-gutter:stable] lg:h-auto"
            onScroll={handleScroll}
            tabIndex={0}
            aria-label={t('autocare.providersTitle')}
        >
            <div className="relative" style={{ height: loadedProviders.length * ROW_HEIGHT }}>
                {visibleProviders.map((provider, offset) => {
                    const rowIndex = firstVisibleRow + offset

                    return (
                        <div key={provider.id} className="absolute inset-x-0" style={{ height: ROW_HEIGHT, top: rowIndex * ROW_HEIGHT }}>
                            <ProviderResultCard
                                provider={provider}
                                selected={selectedIds.includes(provider.id)}
                                onToggle={() => onToggle(provider.id)}
                                onFocus={() => onFocus(provider.id)}
                            />
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
