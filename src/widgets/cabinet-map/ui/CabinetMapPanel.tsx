import { useEffect, useMemo, useRef, useState } from 'react'
import * as L from 'leaflet'
import { ArrowLeft, ArrowRight, ExternalLink, LocateFixed, Map as MapIcon, Minus, Plus, X } from 'lucide-react'
import { Link } from 'react-router'
import 'leaflet/dist/leaflet.css'

import type { Cabinet } from '@/entities/cabinet'
import { getMediaUrl } from '@/shared/lib/getMediaUrl'
import { getCabinetImageSources } from '@/shared/lib/getCabinetImageSources'
import { routePaths } from '@/shared/constants/routes'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { MAP_CONFIG } from '@/shared/config/map'
import { useTranslation } from '@/shared/lib/useTranslation'
import { ResilientImage } from '@/shared/ui/resilient-image'
import { getCabinetMapPosition, type CabinetMapPosition } from '../lib/cabinetMapCoordinates'
import './cabinet-map.css'

type CabinetMapPanelProps = {
    cabinets: Cabinet[]
    selectedCabinetId?: string
    onSelect: (cabinet: Cabinet) => void
    onClear: () => void
    onBackToList?: () => void
}

type LocationStatus = 'idle' | 'loading' | 'success' | 'error'

const FALLBACK_MAP_POSITION: CabinetMapPosition = [55.751244, 37.618423]

function createOpenStreetMapUrl(position: CabinetMapPosition) {
    const [latitude, longitude] = position
    return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=14/${latitude}/${longitude}`
}

export function CabinetMapPanel({ cabinets, selectedCabinetId, onSelect, onClear, onBackToList }: CabinetMapPanelProps) {
    const { t } = useTranslation()
    const mapContainerRef = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<L.Map | null>(null)
    const markerLayerRef = useRef<L.LayerGroup | null>(null)
    const mapTargetRef = useRef<CabinetMapPosition>(FALLBACK_MAP_POSITION)
    const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle')
    const [tileStatus, setTileStatus] = useState<'loading' | 'ready' | 'error'>('loading')
    const [isMapReady, setIsMapReady] = useState(false)
    const positions = useMemo(
        () => new Map(cabinets.map((cabinet) => [cabinet.id, getCabinetMapPosition(cabinet)])),
        [cabinets],
    )
    const defaultPosition: CabinetMapPosition = positions.get(cabinets[0]?.id) ?? FALLBACK_MAP_POSITION
    const selectedCabinet = cabinets.find((cabinet) => cabinet.id === selectedCabinetId)
    const selectedPosition = selectedCabinet ? positions.get(selectedCabinet.id) : undefined
    const mapUrl = createOpenStreetMapUrl(selectedPosition ?? defaultPosition)

    useEffect(() => {
        mapTargetRef.current = selectedPosition ?? defaultPosition
    }, [defaultPosition, selectedPosition])

    useEffect(() => {
        const container = mapContainerRef.current

        if (!container) return

        let mapInstance: L.Map | null = null
        const initializeMap = () => {
            if (
                mapRef.current
                || container.clientWidth === 0
                || container.clientHeight === 0
            ) return

            const map = L.map(container, {
                zoomControl: false,
                scrollWheelZoom: true,
                preferCanvas: true,
            }).setView(FALLBACK_MAP_POSITION, 11)
            const markerLayer = L.layerGroup().addTo(map)
            const tileLayer = L.tileLayer(MAP_CONFIG.tileUrl, MAP_CONFIG)

            tileLayer.on('load', () => setTileStatus('ready'))
            tileLayer.on('tileerror', () => setTileStatus('error'))
            tileLayer.addTo(map)
            map.on('locationfound', ({ latlng }) => {
                map.setView(latlng, Math.max(map.getZoom(), 13), { animate: true })
                setLocationStatus('success')
            })
            map.on('locationerror', () => setLocationStatus('error'))
            mapRef.current = map
            markerLayerRef.current = markerLayer
            mapInstance = map
            setIsMapReady(true)
        }

        initializeMap()

        const resizeObserver = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(initializeMap)
            : null

        if (resizeObserver) resizeObserver.observe(container)
        else window.addEventListener('resize', initializeMap)

        return () => {
            resizeObserver?.disconnect()
            if (!resizeObserver) window.removeEventListener('resize', initializeMap)
            mapInstance?.remove()
            mapRef.current = null
            markerLayerRef.current = null
            setIsMapReady(false)
        }
    }, [])

    useEffect(() => {
        const map = mapRef.current

        if (!map || map.getSize().x === 0 || map.getSize().y === 0) return

        map.flyTo(selectedPosition ?? defaultPosition, selectedPosition ? 13 : 11, {
            animate: true,
            duration: 0.35,
        })
    }, [defaultPosition, isMapReady, selectedPosition])

    useEffect(() => {
        const markerLayer = markerLayerRef.current

        if (!markerLayer) return

        markerLayer.clearLayers()

        for (const cabinet of cabinets) {
            const position = positions.get(cabinet.id)

            if (!position) continue

            const isSelected = cabinet.id === selectedCabinetId
            const marker = L.circleMarker(position, {
                color: 'var(--card)',
                fillColor: 'var(--primary)',
                fillOpacity: 1,
                radius: isSelected ? 10 : 7,
                weight: isSelected ? 4 : 3,
            })

            marker.bindTooltip(formatCurrency(cabinet.pricePerHour), {
                className: `price-label ${isSelected ? 'selected' : ''}`,
                direction: 'top',
                offset: [0, -8],
                permanent: true,
            })
            marker.on('click', () => onSelect(cabinet))
            marker.addTo(markerLayer)

            if (isSelected) marker.openTooltip()
        }
    }, [cabinets, onSelect, positions, selectedCabinetId])

    const zoomIn = () => mapRef.current?.zoomIn()
    const zoomOut = () => mapRef.current?.zoomOut()
    const useCurrentLocation = () => {
        if (!navigator.geolocation || !mapRef.current) {
            setLocationStatus('error')
            return
        }

        setLocationStatus('loading')
        mapRef.current.locate({ enableHighAccuracy: false, timeout: 10_000 })
    }

    return (
        <section className="relative order-1 block min-h-[420px] overflow-hidden border-b bg-muted md:min-h-[560px] xl:order-none xl:sticky xl:top-0 xl:min-h-[720px] xl:border-b-0 xl:border-l xl:h-[calc(100vh-76px)]" aria-label={t('cabinet.publicList.mapTitle')}>
            <div className="autocarehub-leaflet absolute inset-0">
                <div ref={mapContainerRef} className="h-full min-h-[420px] w-full md:min-h-[560px] xl:min-h-[720px]" />
            </div>

            <div className="absolute left-5 top-5 z-[500] flex items-center gap-2 rounded-md border bg-background/95 px-3 py-2 text-xs font-bold shadow-sm backdrop-blur">
                <MapIcon className="size-4 text-primary" />
                {t('cabinet.publicList.mapTitle')}
            </div>
            <p className="absolute left-5 top-[4.75rem] z-[500] max-w-[220px] text-xs font-medium leading-4 text-muted-foreground">
                {t('cabinet.publicList.mapApproximate')}
            </p>

            {onBackToList && (
                <button
                    type="button"
                    onClick={onBackToList}
                    className="absolute left-5 top-[7.25rem] z-[500] inline-flex items-center gap-2 rounded-md border bg-background/95 px-3 py-2 text-xs font-bold shadow-sm backdrop-blur transition-colors hover:bg-muted"
                >
                    <ArrowLeft className="size-3.5" />
                    {t('cabinet.publicList.backToSplitView')}
                </button>
            )}

            <div className="absolute right-5 top-5 z-[500] flex flex-col overflow-visible rounded-md border bg-background/95 shadow-sm backdrop-blur">
                <button
                    type="button"
                    onClick={zoomIn}
                    className="flex size-10 items-center justify-center border-b hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                    aria-label={t('cabinet.publicList.mapZoomIn')}
                >
                    <Plus className="size-4" />
                </button>
                <button
                    type="button"
                    onClick={zoomOut}
                    className="flex size-10 items-center justify-center border-b hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                    aria-label={t('cabinet.publicList.mapZoomOut')}
                >
                    <Minus className="size-4" />
                </button>
                <button
                    type="button"
                    onClick={useCurrentLocation}
                    className="flex size-10 items-center justify-center hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                    aria-label={t('cabinet.publicList.mapCurrentLocation')}
                >
                    <LocateFixed className="size-4" />
                </button>
                {locationStatus !== 'idle' && (
                    <p className="absolute right-0 top-[132px] w-44 rounded-md border bg-background/95 p-2 text-xs font-semibold leading-4 text-muted-foreground shadow-sm">
                        {locationStatus === 'loading' && t('cabinet.publicList.mapLocationLoading')}
                        {locationStatus === 'success' && t('cabinet.publicList.mapLocationFound')}
                        {locationStatus === 'error' && t('cabinet.publicList.mapLocationError')}
                    </p>
                )}
            </div>

            {tileStatus === 'error' && (
                <div className="absolute inset-x-5 top-24 z-[500] rounded-md border border-destructive/20 bg-background/95 p-3 text-xs font-semibold text-destructive shadow-sm">
                    {t('cabinet.publicList.mapTileError')}
                </div>
            )}

            {selectedCabinet && selectedPosition && (
                <div className="absolute inset-x-5 bottom-5 z-[500] overflow-hidden rounded-xl border bg-background/95 shadow-xl shadow-foreground/10 backdrop-blur">
                    <div className="flex items-start justify-between border-b px-4 py-3">
                        <p className="text-xs font-bold text-muted-foreground">{t('cabinet.publicList.selectedCabinet')}</p>
                        <button type="button" onClick={onClear} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={t('common.close')}>
                            <X className="size-4" />
                        </button>
                    </div>
                    <div className="grid gap-4 p-4 sm:grid-cols-[150px_minmax(0,1fr)]">
                        <div className="h-28 overflow-hidden rounded-lg bg-muted">
                            {selectedCabinet.photos[0] ? (
                                <ResilientImage
                                    src={getCabinetImageSources(selectedCabinet.photos[0], selectedCabinet.photoAssets).src ?? getMediaUrl(selectedCabinet.photos[0])}
                                    alt={t('cabinet.publicList.imageAlt', { title: selectedCabinet.title })}
                                    className="h-full w-full object-cover"
                                    decoding="async"
                                    loading="lazy"
                                    width={320}
                                    height={240}
                                />
                            ) : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">{t('cabinet.publicList.photoFallback')}</div>}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-status-success-foreground">{t('landing.availableBadge')}</p>
                            <h2 className="mt-1 truncate text-base font-black">{selectedCabinet.title}</h2>
                            <p className="mt-1 text-sm text-muted-foreground">{selectedCabinet.city}</p>
                            <div className="mt-4 flex flex-wrap items-center gap-3">
                                <Link to={routePaths.cabinetDetails(selectedCabinet.id)} className="inline-flex items-center gap-2 text-sm font-extrabold text-primary hover:underline">
                                    {t('cabinet.publicList.view')}
                                    <ArrowRight className="size-4" />
                                </Link>
                                <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary">
                                    {t('cabinet.publicList.openMap')}
                                    <ExternalLink className="size-3.5" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}
