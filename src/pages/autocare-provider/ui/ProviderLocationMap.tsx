import { useEffect, useRef } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import type { ProviderProfile } from '@/entities/automotive-service'
import { MAP_CONFIG } from '@/shared/config/map'
import { useTranslation } from '@/shared/lib/useTranslation'

import './provider-location-map.css'

export function ProviderLocationMap({ provider }: { provider: ProviderProfile }) {
    const { t } = useTranslation()
    const mapContainerRef = useRef<HTMLDivElement | null>(null)
    const latitude = provider.mapPosition?.[0] ?? 55.7522
    const longitude = provider.mapPosition?.[1] ?? 37.6156

    useEffect(() => {
        const container = mapContainerRef.current
        if (!container) return
        const position: [number, number] = [latitude, longitude]
        const map = L.map(container, { zoomControl: false, attributionControl: false, scrollWheelZoom: false }).setView(position, 14)
        L.tileLayer(MAP_CONFIG.tileUrl, MAP_CONFIG).addTo(map)
        L.marker(position, { icon: L.divIcon({ className: 'provider-map-marker-host', html: '<span class="provider-map-marker" aria-hidden="true"></span>', iconSize: [32, 42], iconAnchor: [16, 42] }) }).addTo(map)
        const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => map.invalidateSize())
        resizeObserver?.observe(container)
        return () => { resizeObserver?.disconnect(); map.remove() }
    }, [latitude, longitude])

    return <div className="relative h-full min-h-36 overflow-hidden rounded-[var(--radius-card)]"><div ref={mapContainerRef} className="provider-location-map h-full w-full" /><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(provider.address)}`} target="_blank" rel="noreferrer" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-control)] bg-card px-3 py-2 text-xs font-black text-primary shadow-lg">{t('autocare.viewOnMap')}</a></div>
}
