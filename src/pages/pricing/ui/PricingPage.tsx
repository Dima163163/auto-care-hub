import { Check, Gift, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router'

import { buttonVariants } from '@/components/ui/button-variants'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'

export function PricingPage() {
    const { t } = useTranslation()

    return (
        <main className="relative z-0 min-h-full bg-background px-4 py-8 lg:px-8">
            <section className="mx-auto max-w-6xl">
            <PageHeader
                eyebrow={t('autocare.pricingEyebrow')}
                title={t('autocare.pricingTitle')}
                description={t('autocare.pricingDescription')}
            />

            <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[var(--radius-panel)] border border-primary/20 bg-card p-8 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
                        {t('autocare.pricingFreeBadge')}
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                        <span className="flex size-12 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary">
                            <Sparkles className="size-6" />
                        </span>
                        <h2 className="text-3xl font-black tracking-tight">{t('autocare.pricingFreeTitle')}</h2>
                    </div>
                    <p className="mt-5 max-w-xl text-sm leading-6 text-muted-foreground">
                        {t('autocare.pricingFreeDescription')}
                    </p>
                    <ul className="mt-6 space-y-3">
                        {['autocare.pricingFreeFeatureProfile', 'autocare.pricingFreeFeatureOffers', 'autocare.pricingFreeFeatureRequests'].map((key) => (
                            <li key={key} className="flex gap-3 text-sm font-semibold text-foreground">
                                <Check className="size-5 shrink-0 text-status-success-foreground" />
                                <span>{t(key as 'autocare.pricingFreeFeatureProfile')}</span>
                            </li>
                        ))}
                    </ul>

                    <Link to={ROUTES.ownerDashboard} className={buttonVariants({ className: 'mt-8' })}>
                        {t('autocare.pricingOwnerAction')}
                    </Link>
                </div>

                <div className="rounded-[var(--radius-panel)] border bg-card p-8 shadow-sm">
                    <div className="flex size-12 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary">
                        <ShieldCheck className="size-6" />
                    </div>
                    <h2 className="mt-5 text-xl font-bold">{t('autocare.pricingFutureTitle')}</h2>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{t('autocare.pricingFutureDescription')}</p>
                    <ul className="mt-6 space-y-4">
                        {['autocare.pricingFutureFeaturePeriods', 'autocare.pricingFutureFeatureGrants', 'autocare.pricingFutureFeaturePromos'].map((key) => (
                            <li key={key} className="flex gap-3 text-sm font-semibold text-foreground">
                                <Gift className="size-5 shrink-0 text-primary" />
                                <span>{t(key as 'autocare.pricingFutureFeaturePeriods')}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            </section>
        </main>
    )
}
