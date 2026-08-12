import { Check } from 'lucide-react'
import { Link } from 'react-router'

import { buttonVariants } from '@/components/ui/button-variants'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'

export function PricingPage() {
    const { t } = useTranslation()

    return (
        <section className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
            <PageHeader
                title={t('commission.title')}
                description={t('commission.description')}
            />

            <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-xl border bg-card p-8 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
                        {t('commission.eyebrow')}
                    </p>
                    <div className="mt-4 flex items-end gap-3">
                        <span className="text-6xl font-black tracking-tight">2%</span>
                        <span className="pb-2 text-sm text-muted-foreground">
                            {t('commission.perBooking')}
                        </span>
                    </div>
                    <p className="mt-5 max-w-xl text-muted-foreground">
                        {t('commission.mainDescription')}
                    </p>

                    <Link to={ROUTES.ownerDashboard} className={buttonVariants({ className: 'mt-8' })}>
                        {t('commission.ownerAction')}
                    </Link>
                </div>

                <div className="rounded-xl border bg-card p-8 shadow-sm">
                    <h2 className="text-xl font-bold">{t('commission.includesTitle')}</h2>
                    <ul className="mt-6 space-y-4">
                        {[
                            'commission.featureNoSubscription',
                            'commission.featureSuccessfulOnly',
                            'commission.featureTransparent',
                            'commission.featurePayouts',
                        ].map((key) => (
                            <li key={key} className="flex gap-3 text-sm text-muted-foreground">
                                <Check className="size-5 shrink-0 text-primary" />
                                <span>{t(key as 'commission.featureNoSubscription')}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    )
}
