import { useEffect, useMemo, useRef, useState } from 'react'
import * as L from 'leaflet'
import { LocateFixed, Map as MapIcon, Minus, Plus, X } from 'lucide-react'
import { Link } from 'react-router'
import 'leaflet/dist/leaflet.css'

import type { ProviderPreview } from '@/entities/automotive-service'
import { routePaths } from '@/shared/constants/routes'
import { RESULTS_MAP_CONFIG } from '@/shared/config/map'
import { useTranslation } from '@/shared/lib/useTranslation'

import './autocare-results-map.css'

type AutoCareMapPreviewProps = {
    providers: readonly ProviderPreview[]
    selectedProviders: readonly ProviderPreview[]
    focusedProviderId: string | null
    onFocusProvider: (id: string | null) => void
    onRemove: (id: string) => void
}

type MapPosition = [number, number]
const MOSCOW_CENTER: MapPosition = [55.751244, 37.618423]

function fallbackPosition(index: number): MapPosition {
    return [MOSCOW_CENTER[0] + (index - 1) * 0.012, MOSCOW_CENTER[1] + (index - 1) * 0.018]
}

function formatPrice(provider: ProviderPreview) {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: provider.currency, maximumFractionDigits: 0 }).format(provider.price)
}

function markerMarkup(provider: ProviderPreview, focused: boolean, fromLabel: string) {
    const tone = provider.verified ? 'success' : 'primary'
    return `<div class="results-map-price-marker results-map-price-marker--${tone}${focused ? ' is-focused' : ''}"><span class="results-map-price-marker__pin" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M7 8.5h10M8.5 8.5v5m7-5v5M6 13.5h12l1.5 2.5H4.5L6 13.5Zm1.5 2.5v2m9-2v2M5 11.5h14" /></svg></span><span class="results-map-price-marker__copy"><strong>${fromLabel} ${formatPrice(provider)}</strong><span>★ ${provider.rating.toFixed(1)}</span></span></div>`
}

export function AutoCareMapPreview({ providers, selectedProviders, focusedProviderId, onFocusProvider, onRemove }: AutoCareMapPreviewProps) {
    const { t } = useTranslation()
    const mapContainerRef = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<L.Map | null>(null)
    const markerLayerRef = useRef<L.LayerGroup | null>(null)
    const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [tileError, setTileError] = useState(false)
    const positions = useMemo(() => new Map(providers.map((provider, index) => [provider.id, provider.mapPosition ?? fallbackPosition(index)])), [providers])
    const focusedProvider = providers.find((provider) => provider.id === focusedProviderId)
    const focusedPosition = focusedProvider ? positions.get(focusedProvider.id) : undefined

    useEffect(() => {
        const container = mapContainerRef.current
        if (!container || mapRef.current) return

        const map = L.map(container, { zoomControl: false, scrollWheelZoom: true, preferCanvas: true }).setView(MOSCOW_CENTER, 12)
        const markerLayer = L.layerGroup().addTo(map)
        const tileLayer = L.tileLayer(RESULTS_MAP_CONFIG.tileUrl, { ...RESULTS_MAP_CONFIG, detectRetina: true })
        tileLayer.on('tileerror', () => setTileError(true))
        tileLayer.addTo(map)
        mapRef.current = map
        markerLayerRef.current = markerLayer
        const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => map.invalidateSize()) : null
        resizeObserver?.observe(container)

        return () => {
            resizeObserver?.disconnect()
            map.remove()
            mapRef.current = null
            markerLayerRef.current = null
        }
    }, [])

    useEffect(() => {
        const map = mapRef.current
        if (!map) return
        if (focusedPosition) map.flyTo(focusedPosition, Math.max(map.getZoom(), 13), { animate: true, duration: 0.35 })
        else if (providers.length > 1) map.fitBounds(L.latLngBounds(providers.map((provider, index) => positions.get(provider.id) ?? fallbackPosition(index))), { padding: [48, 48], maxZoom: 12, animate: true })
    }, [focusedPosition, positions, providers])

    useEffect(() => {
        const markerLayer = markerLayerRef.current
        if (!markerLayer) return
        markerLayer.clearLayers()

        providers.forEach((provider, index) => {
            const position = positions.get(provider.id) ?? fallbackPosition(index)
            const isFocused = provider.id === focusedProviderId
            const marker = L.marker(position, {
                icon: L.divIcon({
                    className: 'results-map-marker-host',
                    html: markerMarkup(provider, isFocused, t('autocare.fromPrice', { price: '' }).replace(/\s+$/, '')),
                    iconSize: [144, 52],
                    iconAnchor: [72, 52],
                }),
                keyboard: true,
                title: `${provider.name}, ${formatPrice(provider)}`,
            })
            marker.on('click', () => onFocusProvider(provider.id))
            marker.addTo(markerLayer)
        })
    }, [focusedProviderId, onFocusProvider, positions, providers, t])

    const locate = () => {
        if (!navigator.geolocation || !mapRef.current) {
            setLocationStatus('error')
            return
        }
        setLocationStatus('loading')
        mapRef.current.once('locationfound', ({ latlng }) => {
            mapRef.current?.flyTo(latlng, 13, { animate: true })
            setLocationStatus('success')
        })
        mapRef.current.once('locationerror', () => setLocationStatus('error'))
        mapRef.current.locate({ enableHighAccuracy: false, timeout: 10_000 })
    }

    return (
        <aside className="relative h-full min-h-[420px] overflow-hidden rounded-[var(--radius-panel)] border border-border bg-muted shadow-sm lg:min-h-0 lg:sticky lg:top-6" aria-label={t('autocare.mapPreviewLabel')}>
            <div className="autocarehub-results-leaflet absolute inset-0"><div ref={mapContainerRef} className="h-full w-full" /></div>
            <div className="absolute left-4 top-4 z-[500] flex items-center gap-2 rounded-[var(--radius-control)] border border-primary-foreground/15 bg-hero-overlay/90 px-3 py-2 text-xs font-black text-primary-foreground shadow-lg shadow-black/20 backdrop-blur"><MapIcon className="size-4 text-primary" />{t('autocare.mapPreviewLabel')}</div>
            <div className="absolute right-4 top-4 z-[500] flex flex-col overflow-hidden rounded-[var(--radius-control)] border border-primary-foreground/15 bg-hero-overlay/90 text-primary-foreground shadow-lg shadow-black/20 backdrop-blur">
                <button type="button" onClick={() => mapRef.current?.zoomIn()} className="inline-flex size-10 items-center justify-center border-b border-primary-foreground/15 hover:bg-primary-foreground/10" aria-label="Zoom in"><Plus className="size-4" /></button>
                <button type="button" onClick={() => mapRef.current?.zoomOut()} className="inline-flex size-10 items-center justify-center border-b border-primary-foreground/15 hover:bg-primary-foreground/10" aria-label="Zoom out"><Minus className="size-4" /></button>
                <button type="button" onClick={locate} className="inline-flex size-10 items-center justify-center hover:bg-primary-foreground/10" aria-label={t('cabinet.publicList.mapCurrentLocation')}><LocateFixed className="size-4" /></button>
            </div>
            {tileError && <p className="absolute inset-x-4 top-20 z-[500] rounded-[var(--radius-control)] border border-status-warning-border bg-status-warning-surface px-3 py-2 text-xs font-semibold text-status-warning-foreground">{t('cabinet.publicList.mapTileError')}</p>}
            {locationStatus !== 'idle' && <p className="absolute right-4 top-40 z-[500] max-w-44 rounded-[var(--radius-control)] border border-primary-foreground/15 bg-hero-overlay/95 p-2 text-xs font-semibold text-primary-foreground/80 shadow-lg backdrop-blur">{locationStatus === 'loading' ? t('cabinet.publicList.mapLocationLoading') : locationStatus === 'success' ? t('cabinet.publicList.mapLocationFound') : t('cabinet.publicList.mapLocationError')}</p>}
            {focusedProvider && <div className="absolute inset-x-4 bottom-4 z-[500] overflow-hidden rounded-[var(--radius-panel)] border border-primary-foreground/15 bg-hero-overlay/95 text-primary-foreground shadow-xl shadow-black/30 backdrop-blur"><div className="flex items-start justify-between gap-3 border-b border-primary-foreground/15 px-4 py-3"><div><p className="text-xs font-bold text-primary">{t('autocare.trustedBadge')}</p><h2 className="mt-1 text-base font-black">{focusedProvider.name}</h2></div><button type="button" onClick={() => onFocusProvider(null)} className="rounded-md p-1 text-primary-foreground/70 hover:bg-primary-foreground/10" aria-label={t('common.close')}><X className="size-4" /></button></div><div className="flex items-center justify-between gap-3 px-4 py-3"><div><p className="text-sm font-black">{formatPrice(focusedProvider)}</p><p className="mt-1 text-xs font-semibold text-primary-foreground/70">★ {focusedProvider.rating} · {focusedProvider.distance}</p></div><div className="flex gap-2"><button type="button" onClick={() => onRemove(focusedProvider.id)} className="inline-flex h-9 items-center rounded-[var(--radius-control)] border border-primary-foreground/20 px-3 text-xs font-bold text-primary-foreground hover:border-primary">{selectedProviders.some((provider) => provider.id === focusedProvider.id) ? t('autocare.clearCompare') : t('autocare.compareAction')}</button><Link to={routePaths.serviceProviderDetails(focusedProvider.id)} className="inline-flex h-9 items-center rounded-[var(--radius-control)] bg-primary px-3 text-xs font-bold text-primary-foreground">{t('autocare.detailsAction')}</Link></div></div></div>}
        </aside>
    )
}
