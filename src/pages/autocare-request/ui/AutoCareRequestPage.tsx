import { useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'

import { getProviderProfile } from '@/entities/automotive-service'
import { routePaths } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

import { RequestForm } from './RequestForm'
import { RequestOrderSummary, RequestSummary } from './RequestSummary'
import { RequestSteps } from './RequestSteps'

export function AutoCareRequestPage() {
    const { id = '' } = useParams()
    const [searchParams] = useSearchParams()
    const { t } = useTranslation()
    const [submitted, setSubmitted] = useState(false)
    const provider = getProviderProfile(id)
    const offering = useMemo(
        () => provider?.offerings.find((item) => item.serviceId === searchParams.get('service')) ?? provider?.offerings[0],
        [provider, searchParams],
    )

    if (!provider || !offering) {
        return <main className="mx-auto max-w-[var(--layout-public-max)] px-[var(--layout-gutter)] py-20 text-center"><h1 className="text-2xl font-black text-foreground">{t('autocare.providerNotFound')}</h1></main>
    }

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setSubmitted(true)
    }

    return (
        <main className="min-h-full bg-background">
            <section className="bg-hero-overlay pb-7 pt-5 text-primary-foreground sm:pb-9">
                <div className="mx-auto max-w-[var(--layout-operational-max)] px-[var(--layout-gutter)]">
                    <Link to={routePaths.serviceProviderDetails(provider.id)} className="inline-flex items-center gap-2 text-xs font-bold text-primary-foreground/70 hover:text-primary-foreground"><ArrowLeft className="size-3.5" />{t('autocare.providerBackToResults')}</Link>
                    <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{t('autocare.requestTitle')}</h1>
                    <p className="mt-2 text-sm font-medium text-primary-foreground/70">{t('autocare.requestProviderConfirmation')}</p>
                    <div className="mt-6"><RequestSteps submitted={submitted} /></div>
                </div>
            </section>
            <div className="mx-auto max-w-[var(--layout-operational-max)] px-[var(--layout-gutter)] py-6 sm:py-8">
                <RequestSummary provider={provider} offering={offering} />
                <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div>{submitted ? <RequestSuccess providerId={provider.id} /> : <RequestForm onSubmit={handleSubmit} />}</div>
                    <RequestOrderSummary provider={provider} offering={offering} />
                </div>
            </div>
        </main>
    )
}

function RequestSuccess({ providerId }: { providerId: string }) {
    const { t } = useTranslation()

    return <section className="rounded-[var(--radius-panel)] border border-status-success-border bg-status-success-surface p-6"><CheckCircle2 className="size-8 text-status-success-foreground" /><h2 className="mt-3 text-2xl font-black text-status-success-foreground">{t('autocare.requestSubmittedTitle')}</h2><p className="mt-2 text-sm font-medium leading-6 text-status-success-foreground/80">{t('autocare.requestSubmittedDescription')}</p><Link to={routePaths.serviceProviderDetails(providerId)} className="mt-5 inline-flex h-10 items-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-bold text-primary-foreground">{t('autocare.requestBackToProfile')}</Link></section>
}
