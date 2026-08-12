import { useMemo, useState } from 'react'
import { Heart, MapPin, Share2, ShieldCheck, Star, Tag } from 'lucide-react'
import { toast } from 'sonner'

import type { Cabinet } from '@/entities/cabinet'
import type { Review } from '@/entities/review'
import { getMediaUrl } from '@/shared/lib/getMediaUrl'
import { getCabinetImageSources } from '@/shared/lib/getCabinetImageSources'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { useTranslation } from '@/shared/lib/useTranslation'
import { ResilientImage } from '@/shared/ui/resilient-image'

type CabinetDetailsHeroProps = {
    cabinet: Cabinet
    reviews: Review[]
}

function getCabinetCategory(cabinet: Cabinet) {
    const searchableText = `${cabinet.title} ${cabinet.description}`.toLocaleLowerCase()

    if (searchableText.includes('medical')) return 'medical'
    if (searchableText.includes('coach')) return 'coaching'
    return 'beauty'
}

export function CabinetDetailsHero({ cabinet, reviews }: CabinetDetailsHeroProps) {
    const { t } = useTranslation()
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0)
    const [isSaved, setIsSaved] = useState(false)
    const gallery = cabinet.photos.length > 0 ? cabinet.photos : [undefined]
    const selectedPhoto = gallery[selectedPhotoIndex] ?? gallery[0]
    const selectedPhotoUrl = selectedPhoto ? getMediaUrl(selectedPhoto) : undefined
    const selectedPhotoSources = getCabinetImageSources(selectedPhoto, cabinet.photoAssets)
    const category = getCabinetCategory(cabinet)
    const averageRating = reviews.length > 0
        ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
        : 0
    const categoryLabel = t(`cabinet.details.category${category[0].toUpperCase()}${category.slice(1)}` as 'cabinet.details.categoryBeauty')
    const amenityIcons = useMemo(() => [
        { icon: '✦', label: t('cabinet.details.naturalLight') },
        { icon: '⌂', label: t('cabinet.details.sink') },
        { icon: '▣', label: t('cabinet.details.storage') },
        { icon: '❋', label: t('cabinet.details.airConditioning') },
        { icon: '◌', label: t('cabinet.details.wifi') },
    ], [t])

    const handleShare = async () => {
        const shareData = {
            title: cabinet.title,
            text: cabinet.description,
            url: window.location.href,
        }

        if (navigator.share) {
            await navigator.share(shareData).catch(() => undefined)
            return
        }

        await navigator.clipboard?.writeText(window.location.href)
        toast.success(t('cabinet.details.linkCopied'))
    }

    return (
        <section aria-labelledby="cabinet-details-title">
            <div className="relative overflow-hidden rounded-md bg-muted">
                <div className="aspect-[1.92/1] min-h-[300px] w-full">
                    {selectedPhotoUrl ? (
                        <ResilientImage
                            src={selectedPhotoSources.src ?? selectedPhotoUrl}
                            srcSet={selectedPhotoSources.srcSet}
                            alt={t('cabinet.publicList.imageAlt', { title: cabinet.title })}
                            className="h-full w-full object-cover"
                            width={1280}
                            height={670}
                            sizes="(min-width: 1280px) 65vw, 100vw"
                            fallback={(
                                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                    {t('cabinet.publicList.photoFallback')}
                                </div>
                            )}
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                            {t('cabinet.publicList.photoFallback')}
                        </div>
                    )}
                </div>

                <div className="absolute right-4 top-4 flex gap-2 sm:right-5 sm:top-5">
                    <button
                        type="button"
                        onClick={() => setIsSaved((value) => !value)}
                        className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-background/95 px-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-background"
                        aria-pressed={isSaved}
                    >
                        <Heart className={`size-4 ${isSaved ? 'fill-primary text-primary' : ''}`} />
                        {t('cabinet.details.save')}
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleShare()}
                        className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-background/95 px-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-background"
                    >
                        <Share2 className="size-4" />
                        {t('cabinet.details.share')}
                    </button>
                </div>

                <span className="absolute bottom-4 right-4 rounded-md bg-foreground/80 px-3 py-1.5 text-sm font-semibold text-background">
                    {selectedPhotoIndex + 1} / {gallery.length}
                </span>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6">
                {gallery.map((photo, index) => {
                    const sources = getCabinetImageSources(photo, cabinet.photoAssets)
                    const photoUrl = photo ? getMediaUrl(photo) : undefined

                    return (
                        <button
                            key={`${photo ?? 'empty'}-${index}`}
                            type="button"
                            onClick={() => setSelectedPhotoIndex(index)}
                            className={`aspect-[1.35/1] overflow-hidden rounded-md border-2 bg-muted text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                index === selectedPhotoIndex ? 'border-primary' : 'border-transparent hover:border-primary/50'
                            }`}
                            aria-label={t('cabinet.details.selectPhoto', { number: index + 1 })}
                            aria-pressed={index === selectedPhotoIndex}
                        >
                            {photoUrl ? (
                                <ResilientImage
                                    src={sources.src ?? photoUrl}
                                    srcSet={sources.srcSet}
                                    alt={t('cabinet.publicList.imageAlt', { title: cabinet.title })}
                                    className="h-full w-full object-cover"
                                    width={260}
                                    height={190}
                                />
                            ) : null}
                        </button>
                    )
                })}
            </div>

            <div className="mt-5">
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-status-success-foreground">
                    <ShieldCheck className="size-4" />
                    {t('cabinet.details.verifiedSpace')}
                </div>

                <h1 id="cabinet-details-title" className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                    {cabinet.title}
                </h1>

                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                        <MapPin className="size-4 text-muted-foreground" />
                        {cabinet.city}
                    </span>
                    <span className="inline-flex items-center gap-2">
                        <Tag className="size-4 text-muted-foreground" />
                        {categoryLabel}
                    </span>
                    {averageRating > 0 && (
                        <span className="inline-flex items-center gap-2">
                            <Star className="size-4 fill-rating-fill text-rating-fill" />
                            <strong className="text-foreground">{averageRating.toFixed(1)}</strong>
                            <span>({t('cabinet.details.reviewsCount', { count: reviews.length })})</span>
                        </span>
                    )}
                    <span className="sr-only">{formatCurrency(cabinet.pricePerHour)} {t('cabinet.details.pricePerHour')}</span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-border/80 pb-5 text-sm text-muted-foreground">
                    {(cabinet.amenities ?? []).slice(0, 5).map((amenity, index) => (
                        <span key={amenity} className="inline-flex items-center gap-2">
                            <span className="flex size-5 items-center justify-center text-base text-muted-foreground" aria-hidden="true">
                                {amenityIcons[index]?.icon ?? '•'}
                            </span>
                            {amenity}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    )
}
