import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button-variants'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'

export function ProfileLoading() {
    const { t } = useTranslation()
    
    return (
        <section className="space-y-6 mx-auto max-w-6xl px-4 py-8">
            <PageHeader
                eyebrow={t('common.loading')}
                title={t('profile.title')}
            />

            <div className="rounded-xl border bg-card p-6 shadow-sm">
                <p className="text-muted-foreground">
                    {t('profile.loading')}
                </p>
            </div>
        </section>
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
