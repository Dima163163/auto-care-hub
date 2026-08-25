import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button-variants'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'
import { LoadingRegion, SkeletonText } from '@/shared/ui/loading-skeleton/SkeletonPrimitives'
import { Skeleton } from '@/components/ui/skeleton'

export function ProfileLoading() {
    const { t } = useTranslation()

    return (
        <LoadingRegion label={t('common.loading')} className="mx-auto max-w-6xl space-y-6 px-4 py-8">
            <div className="space-y-3">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-10 w-56" />
                <Skeleton className="h-4 w-full max-w-2xl" />
            </div>
            <div className="flex gap-2">
                <Skeleton className="h-10 w-28 rounded-[var(--radius-control)]" />
                <Skeleton className="h-10 w-32 rounded-[var(--radius-control)]" />
            </div>
            <div className="rounded-[var(--radius-panel)] border border-border bg-card p-6 shadow-sm">
                <Skeleton className="h-6 w-40" />
                <SkeletonText lines={2} className="mt-5 max-w-xl" />
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-24 w-full rounded-[var(--radius-card)]" />
                    <Skeleton className="h-24 w-full rounded-[var(--radius-card)]" />
                </div>
            </div>
        </LoadingRegion>
    )
}

export function ProfileError() {
    const { t } = useTranslation()
    
    return (
        <section className="space-y-6 mx-auto max-w-6xl px-4 py-8">
            <PageHeader
                eyebrow={t('common.error')}
                title={t('profile.title')}
            />

            <div className="rounded-xl border bg-card p-6 shadow-sm">
                <p className="font-medium text-destructive">
                    {t('profile.failedToLoad')}
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                    {t('profile.signInAgain')}
                </p>

                <Link
                    to={ROUTES.login}
                    className={buttonVariants({
                        variant: 'outline',
                        className: 'mt-5',
                    })}
                >
                    {t('profile.goToSignIn')}
                </Link>
            </div>
        </section>
    )
}
