import { useEffect, useRef, useState } from 'react'
import * as L from 'leaflet'
import { ExternalLink, Info, Navigation } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

import type { Cabinet } from '@/entities/cabinet'
import { MAP_CONFIG } from '@/shared/config/map'
import { useTranslation } from '@/shared/lib/useTranslation'
import { createCabinetDirectionsUrl } from '@/features/booking/lib/bookingSuccessLinks'
import { getCabinetMapPosition } from '@/widgets/cabinet-map/lib/cabinetMapCoordinates'
import './cabinet-location-preview.css'

type CabinetLocationPreviewProps = {
    cabinet: Cabinet
}

export function CabinetLocationPreview({ cabinet }: CabinetLocationPreviewProps) {
    const { t } = useTranslation()
    const mapContainerRef = useRef<HTMLDivElement | null>(null)
    const [tileError, setTileError] = useState(false)
    const position = getCabinetMapPosition(cabinet)
    const directionsUrl = createCabinetDirectionsUrl(cabinet)

    useEffect(() => {
        const container = mapContainerRef.current
        if (!container) return

        const map = L.map(container, {
            zoomControl: false,
            attributionControl: true,
            scrollWheelZoom: false,
            dragging: true,
        }).setView(position, 13)
        const tileLayer = L.tileLayer(MAP_CONFIG.tileUrl, MAP_CONFIG)
        tileLayer.on('tileerror', () => setTileError(true))
        tileLayer.addTo(map)

        L.circle(position, {
            color: 'var(--primary)',
            fillColor: 'var(--primary)',
            fillOpacity: 0.12,
            radius: 520,
            weight: 1,
        }).addTo(map)
        L.circleMarker(position, {
            color: 'var(--card)',
            fillColor: 'var(--primary)',
            fillOpacity: 1,
            radius: 10,
            weight: 4,
        }).addTo(map)

        const resizeObserver = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(() => map.invalidateSize())
            : null
        resizeObserver?.observe(container)

        return () => {
            resizeObserver?.disconnect()
            map.remove()
        }
    }, [position])

    return (
        <section className="overflow-hidden rounded-md border border-border/80 bg-card" aria-labelledby="cabinet-location-title">
            <div className="relative h-[168px] bg-muted">
                <div ref={mapContainerRef} className="cabinet-detail-map h-full w-full" />
                {tileError && (
                    <div className="absolute inset-x-3 top-3 rounded-md border bg-background/95 px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm">
                        {t('cabinet.publicList.mapTileError')}
                    </div>
                )}
            </div>
            <div className="flex items-center justify-between gap-3 border-t px-3 py-2 text-xs">
                <div className="min-w-0">
                    <p id="cabinet-location-title" className="truncate font-semibold text-foreground">
                        {cabinet.city}
                    </p>
                    <p className="truncate text-muted-foreground">
                        {t('cabinet.details.exactAreaShown')}
                    </p>
                </div>
                <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-primary hover:underline"
                >
                    <Navigation className="size-3.5" />
                    {t('cabinet.details.planRoute')}
                    <ExternalLink className="size-3" />
                </a>
            </div>
            <div className="flex items-start gap-2 border-t bg-muted/30 px-3 py-2 text-xs leading-4 text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span>{t('cabinet.details.routeAfterBooking')}</span>
            </div>
        </section>
    )
}
