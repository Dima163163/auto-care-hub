import type { KeyboardEvent, MouseEvent } from 'react'
import { Link } from 'react-router'
import { Heart } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button-variants'
import type { Cabinet } from '@/entities/cabinet'
import { routePaths } from '@/shared/constants/routes'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { getMediaUrl } from '@/shared/lib/getMediaUrl'
import { getCabinetImageSources } from '@/shared/lib/getCabinetImageSources'
import { useTranslation } from '@/shared/lib/useTranslation'
import { ResilientImage } from '@/shared/ui/resilient-image'

type CabinetCardProps = {
    cabinet: Cabinet
    isFavorite: boolean
    onToggleFavorite: (cabinet: Cabinet) => void
    layout?: 'card' | 'row'
    onSelect?: (cabinet: Cabinet) => void
    onOpenDetails?: (cabinet: Cabinet) => void
    detailsFrom?: 'filtered-catalog'
}

export function CabinetCard({
    cabinet,
    isFavorite,
    onToggleFavorite,
    layout = 'card',
    onSelect,
    onOpenDetails,
    detailsFrom,
}: CabinetCardProps) {
    const { t } = useTranslation()
    const [coverPhoto] = cabinet.photos
    const coverPhotoUrl = coverPhoto ? getMediaUrl(coverPhoto) : undefined
    const imageSources = getCabinetImageSources(coverPhoto, cabinet.photoAssets)
    const detailsUrl = routePaths.cabinetDetails(cabinet.id, { from: detailsFrom })
    const isRow = layout === 'row'
    const handleCardClick = (event: MouseEvent<HTMLElement>) => {
        if (!onSelect || (event.target as HTMLElement).closest('a,button')) return
        onSelect(cabinet)
    }
    const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        if (!onSelect || (event.key !== 'Enter' && event.key !== ' ')) return
        if ((event.target as HTMLElement).closest('a,button')) return
        event.preventDefault()
        onSelect(cabinet)
    }

    return (
        <article
            className={`h-full rounded-xl border bg-card shadow-sm transition-shadow ${
                isRow ? 'grid gap-4 p-3 sm:grid-cols-[180px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]' : 'flex flex-col p-5'
            } ${onSelect ? 'cursor-pointer hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary' : ''}`}
            onClick={handleCardClick}
            onKeyDown={handleCardKeyDown}
            tabIndex={onSelect ? 0 : undefined}
            aria-label={onSelect ? cabinet.title : undefined}
        >
            <div className={`relative overflow-hidden rounded-lg bg-muted ${isRow ? 'min-h-40 xl:min-h-[166px]' : 'mb-4 h-40'}`}>
                {coverPhotoUrl ? (
                    <ResilientImage
                        src={imageSources.src ?? coverPhotoUrl}
                        srcSet={imageSources.srcSet}
                        alt={t('cabinet.publicList.imageAlt', {
                            title: cabinet.title,
                        })}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                        width={640}
                        height={480}
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        fallback={
                            <div className="flex h-full items-center justify-center">
                                <span className="text-sm text-muted-foreground">
                                    {t('cabinet.publicList.photoFallback')}
                                </span>
                            </div>
                        }
                    />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <span className="text-sm text-muted-foreground">
                            {t('cabinet.publicList.photoFallback')}
                        </span>
                    </div>
                )}
                <button
                    type="button"
                    onClick={() => onToggleFavorite(cabinet)}
                    className={`absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-card shadow-sm ${isFavorite ? 'text-destructive' : 'text-muted-foreground'}`}
                    aria-label={isFavorite ? t('favorites.remove') : t('landing.favoriteCabinet')}
                    aria-pressed={isFavorite}
                >
                    <Heart className={`size-5 ${isFavorite ? 'fill-current' : ''}`} />
                </button>
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div className="mb-3">
                    <p className="text-sm text-muted-foreground">
                        {cabinet.city}
                    </p>

                    <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground xl:text-lg">
                        {cabinet.title}
                    </h2>
                </div>

                    <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                        {cabinet.description}
                    </p>

                    {cabinet.availabilityPreview && (
                        <div className="mt-4">
                            <p className="mb-2 text-xs font-medium text-muted-foreground">
                                {t('cabinet.publicList.todayAvailability')}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {cabinet.availabilityPreview.slots.map((slot) => (
                                    <span
                                        key={`${slot.startTime}-${slot.endTime}`}
                                    className="rounded-full border border-secondary bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground"
                                    >
                                        {slot.startTime}–{slot.endTime}
                                    </span>
                                ))}
                                {cabinet.availabilityPreview.freeSlots > cabinet.availabilityPreview.slots.length && (
                                    <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                        +{cabinet.availabilityPreview.freeSlots - cabinet.availabilityPreview.slots.length}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                <div className="mt-5 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            {t('cabinet.publicList.from')}
                        </p>

                        <p className="text-lg font-semibold text-foreground">
                            {formatCurrency(cabinet.pricePerHour)}
                            <span className="ml-1 text-sm font-normal text-muted-foreground">
                                {t('cabinet.publicList.perHourShort')}
                            </span>
                        </p>
                    </div>

                    <Link
                        to={detailsUrl}
                        onClick={() => onOpenDetails?.(cabinet)}
                        className={buttonVariants({
                            variant: 'outline',
                            size: 'sm',
                            className: 'border-primary/30 bg-background text-primary hover:bg-primary/5',
                        })}
                    >
                        {t('cabinet.publicList.view')}
                    </Link>
                </div>
            </div>
        </article>
    )
}
