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

type ProviderBranch = { provider: AutoCareApiProvider; location: AutoCareApiProvider['location'] }

function getMarkerMarkup({ provider, location }: ProviderBranch) {
    const name = escapeHtml(provider.name)
    const address = escapeHtml(location.address)

    return `<div class="owner-provider-map-marker"><span class="owner-provider-map-marker__pin" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z"/><circle cx="12" cy="10" r="2.4"/></svg></span><span class="owner-provider-map-marker__copy"><strong>${name}</strong><span>${address}</span><b>★ ${provider.rating.toFixed(1)}</b></span></div>`
}

type OwnerAutoCareProviderMapProps = {
    providers: AutoCareApiProvider[]
}

export function OwnerAutoCareProviderMap({ providers }: OwnerAutoCareProviderMapProps) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<L.Map | null>(null)
    const markerLayerRef = useRef<L.LayerGroup | null>(null)
    const branches = useMemo<ProviderBranch[]>(() => providers.flatMap((provider) => (provider.locations?.length ? provider.locations : [{ location: provider.location, offers: provider.offers ?? [] }]).map(({ location }) => ({ provider, location }))), [providers])
    const positions = useMemo(() => new Map(branches.map((branch, index) => [
        `${branch.provider.id}:${branch.location.id}`,
        branch.location.latitude !== null && branch.location.longitude !== null
            ? [branch.location.latitude, branch.location.longitude] as MapPosition
            : getFallbackPosition(index),
    ])), [branches])

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
        const points = branches.map((branch, index) => positions.get(`${branch.provider.id}:${branch.location.id}`) ?? getFallbackPosition(index))

        branches.forEach((branch, index) => {
            const position = points[index]
            L.marker(position, {
                icon: L.divIcon({
                    className: 'owner-provider-map-marker-host',
                    html: getMarkerMarkup(branch),
                    iconAnchor: [26, 54],
                    iconSize: [224, 58],
                }),
                keyboard: true,
                title: `${branch.provider.name}, ${branch.location.address}, ${branch.provider.rating.toFixed(1)}`,
            }).addTo(layer)
        })

        if (points.length > 1) {
            map.fitBounds(L.latLngBounds(points), { animate: false, maxZoom: 12, padding: [80, 80] })
        } else if (points[0]) {
            map.setView(points[0], 13, { animate: false })
        } else {
            map.setView(MOSCOW_CENTER, 10, { animate: false })
        }
    }, [branches, positions])

    return <div className="owner-provider-map h-full w-full" ref={mapContainerRef} />
}
