import { useEffect, useMemo, useRef } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import type { AutoCareApiProvider } from '@/entities/automotive-service'
import { RESULTS_MAP_CONFIG } from '@/shared/config/map'

import './owner-autocare-provider-map.css'

type MapPosition = [number, number]

const MOSCOW_CENTER: MapPosition = [55.751244, 37.618423]

function getFallbackPosition(index: number): MapPosition {
    return [MOSCOW_CENTER[0] + index * 0.014, MOSCOW_CENTER[1] + index * 0.019]
}

function escapeHtml(value: string) {
    return value.replace(/[&<>'"]/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
    }[character] ?? character))
}

function getMarkerMarkup(provider: AutoCareApiProvider) {
    const name = escapeHtml(provider.name)
    const address = escapeHtml(provider.location.address)

    return `<div class="owner-provider-map-marker"><span class="owner-provider-map-marker__pin" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z"/><circle cx="12" cy="10" r="2.4"/></svg></span><span class="owner-provider-map-marker__copy"><strong>${name}</strong><span>${address}</span><b>★ ${provider.rating.toFixed(1)}</b></span></div>`
}

type OwnerAutoCareProviderMapProps = {
    providers: AutoCareApiProvider[]
}

export function OwnerAutoCareProviderMap({ providers }: OwnerAutoCareProviderMapProps) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<L.Map | null>(null)
    const markerLayerRef = useRef<L.LayerGroup | null>(null)
    const positions = useMemo(
        () => new Map(providers.map((provider, index) => [
            provider.id,
            provider.location.latitude !== null && provider.location.longitude !== null
                ? [provider.location.latitude, provider.location.longitude] as MapPosition
                : getFallbackPosition(index),
        ])),
        [providers],
    )

    useEffect(() => {
        const container = mapContainerRef.current
        if (!container || mapRef.current) return

        const map = L.map(container, {
            attributionControl: false,
            preferCanvas: true,
            scrollWheelZoom: false,
            zoomControl: false,
        }).setView(MOSCOW_CENTER, 10)
        const layer = L.layerGroup().addTo(map)
        L.tileLayer(RESULTS_MAP_CONFIG.tileUrl, { ...RESULTS_MAP_CONFIG, detectRetina: true }).addTo(map)

        const resizeObserver = typeof ResizeObserver === 'undefined'
            ? null
            : new ResizeObserver(() => map.invalidateSize())

        resizeObserver?.observe(container)
        mapRef.current = map
        markerLayerRef.current = layer

        return () => {
            resizeObserver?.disconnect()
            map.remove()
            mapRef.current = null
            markerLayerRef.current = null
        }
    }, [])

    useEffect(() => {
        const map = mapRef.current
        const layer = markerLayerRef.current
        if (!map || !layer) return

        layer.clearLayers()
        const points = providers.map((provider, index) => positions.get(provider.id) ?? getFallbackPosition(index))

        providers.forEach((provider, index) => {
            const position = points[index]
            L.marker(position, {
                icon: L.divIcon({
                    className: 'owner-provider-map-marker-host',
                    html: getMarkerMarkup(provider),
                    iconAnchor: [26, 54],
                    iconSize: [224, 58],
                }),
                keyboard: true,
                title: `${provider.name}, ${provider.location.address}, ${provider.rating.toFixed(1)}`,
            }).addTo(layer)
        })

        if (points.length > 1) {
            map.fitBounds(L.latLngBounds(points), { animate: false, maxZoom: 12, padding: [80, 80] })
        } else if (points[0]) {
            map.setView(points[0], 13, { animate: false })
        } else {
            map.setView(MOSCOW_CENTER, 10, { animate: false })
        }
    }, [positions, providers])

    return <div className="owner-provider-map h-full w-full" ref={mapContainerRef} />
}
