import { useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'

import { getProviderProfile } from '@/entities/automotive-service'
import { routePaths } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

import { RequestForm } from './RequestForm'
import { RequestSteps } from './RequestSteps'
import { RequestSummary } from './RequestSummary'

export function AutoCareRequestPage() {
    const { id = '' } = useParams()
    const [searchParams] = useSearchParams()
    const { t } = useTranslation()
    const provider = getProviderProfile(id)
    const offering = useMemo(() => provider?.offerings.find((item) => item.serviceId === searchParams.get('service')) ?? provider?.offerings[0], [provider, searchParams])
    const [submitted, setSubmitted] = useState(false)

    if (!provider || !offering) return <main className="mx-auto max-w-[var(--layout-public-max)] px-[var(--layout-gutter)] py-20 text-center"><h1 className="text-2xl font-black text-foreground">{t('autocare.providerNotFound')}</h1></main>

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setSubmitted(true)
    }

    return <main className="min-h-full"><section className="bg-hero-overlay text-primary-foreground"><div className="mx-auto max-w-[var(--layout-operational-max)] px-[var(--layout-gutter)] py-7 sm:py-9"><Link to={routePaths.serviceProviderDetails(provider.id)} className="inline-flex items-center gap-2 text-xs font-bold text-primary-foreground/70 hover:text-primary-foreground"><ArrowLeft className="size-3.5" />{t('autocare.providerBackToResults')}</Link><div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground/60">{t('autocare.requestTitle')}</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{t('autocare.requestTitle')}</h1><p className="mt-2 max-w-2xl text-sm font-medium text-primary-foreground/70">{t('autocare.requestProviderConfirmation')}</p></div><div className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-2 text-xs font-bold"><ShieldCheck className="size-4 text-status-success-foreground" />{t('autocare.providerDirectPayment')}</div></div><div className="mt-6"><RequestSteps submitted={submitted} /></div></div></section><div className="mx-auto max-w-[var(--layout-operational-max)] px-[var(--layout-gutter)] py-7 sm:py-10"><div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.46fr)]"><div className="grid content-start gap-6"><RequestSummary provider={provider} offering={offering} />{submitted ? <section className="rounded-[var(--radius-panel)] border border-status-success-border bg-status-success-surface p-6"><CheckCircle2 className="size-8 text-status-success-foreground" /><h2 className="mt-3 text-2xl font-black text-status-success-foreground">{t('autocare.requestSubmittedTitle')}</h2><p className="mt-2 text-sm font-medium leading-6 text-status-success-foreground/80">{t('autocare.requestSubmittedDescription')}</p><Link to={routePaths.serviceProviderDetails(provider.id)} className="mt-5 inline-flex h-10 items-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-bold text-primary-foreground">{t('autocare.requestBackToProfile')}</Link></section> : <RequestForm onSubmit={handleSubmit} />}</div><aside className="h-fit rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm sm:p-6 lg:sticky lg:top-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{t('autocare.requestTitle')}</p><h2 className="mt-2 text-2xl font-black text-foreground">{provider.name}</h2><div className="mt-5 divide-y divide-border text-sm"><div className="flex items-center justify-between gap-3 py-3"><span className="text-muted-foreground">{t('autocare.requestSelectedService')}</span><strong className="text-right text-foreground">{offering.priceLabel}</strong></div><div className="py-3"><span className="text-muted-foreground">{t('autocare.requestSelectedProvider')}</span><strong className="mt-1 block text-foreground">{provider.address}</strong></div></div><div className="mt-4 rounded-[var(--radius-card)] bg-status-success-surface p-4 text-xs font-semibold leading-5 text-status-success-foreground"><ShieldCheck className="mb-2 size-5" />{t('autocare.requestProviderConfirmation')}</div><p className="mt-4 text-xs font-medium leading-5 text-muted-foreground">{t('autocare.requestDirectPayment')}</p></aside></div></div></main>
}
