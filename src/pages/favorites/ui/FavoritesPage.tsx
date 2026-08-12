import { Heart, MapPin } from 'lucide-react'
import { Link } from 'react-router'

import { ROUTES } from '@/shared/constants/routes'
import { useFavorites } from '@/features/favorites'
import { useTranslation } from '@/shared/lib/useTranslation'
import { StateCard } from '@/shared/ui/state-card'
import { buttonVariants } from '@/components/ui/button-variants'
import { ResilientImage } from '@/shared/ui/resilient-image'
import { getCabinetImageSources } from '@/shared/lib/getCabinetImageSources'

export function FavoritesPage() {
    const { t } = useTranslation()
    const { favorites, toggleFavorite } = useFavorites()

    return (
        <main className="min-h-screen bg-background px-5 py-8 text-foreground lg:px-8">
            <section className="mx-auto max-w-6xl">
                <div className="max-w-2xl">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                        {t('favorites.eyebrow')}
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                        {t('favorites.title')}
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                        {t('favorites.description')}
                    </p>
                </div>

                {favorites.length === 0 ? (
                    <div className="mt-10">
                        <StateCard
                            title={t('favorites.emptyTitle')}
                            description={t('favorites.emptyDescription')}
                            action={
                                <Link to={ROUTES.cabinets} className={buttonVariants()}>
                                    {t('favorites.openCatalog')}
                                </Link>
                            }
                        />
                    </div>
                ) : (
                    <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {favorites.map((favorite) => (
                            <article key={favorite.id} className="overflow-hidden rounded-lg border bg-card shadow-sm">
                                <div className="relative h-44 overflow-hidden bg-muted">
                                    <ResilientImage
                                        src={getCabinetImageSources(favorite.image).src ?? favorite.image ?? null}
                                        srcSet={getCabinetImageSources(favorite.image).srcSet}
                                        alt={favorite.title}
                                        loading="lazy"
                                        decoding="async"
                                        width={640}
                                        height={480}
                                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                                        className="flex h-full w-full items-center justify-center object-cover"
                                        fallback={<span className="text-sm text-muted-foreground">{t('cabinet.publicList.photoFallback')}</span>}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => toggleFavorite(favorite)}
                                        className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-background text-destructive shadow-sm"
                                        aria-label={t('favorites.remove')}
                                    >
                                        <Heart className="size-5 fill-current" />
                                    </button>
                                </div>
                                <div className="p-5">
                                    <h2 className="text-xl font-black">{favorite.title}</h2>
                                    <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                        <MapPin className="size-4" />
                                        {favorite.area}
                                    </p>
                                    <p className="mt-4 text-lg font-black">{favorite.price}</p>
                                    <Link
                                        to={favorite.to}
                                        className="mt-5 flex h-11 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground"
                                    >
                                        {t('favorites.openCabinet')}
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    )
}
