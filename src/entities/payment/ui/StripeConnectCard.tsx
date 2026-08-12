import { ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import {
    useGetStripeConnectStatusQuery,
    useStartStripeConnectOnboardingMutation,
} from '../api/paymentApi'

export function StripeConnectCard() {
    const { t } = useTranslation()
    const { data, isLoading, refetch } = useGetStripeConnectStatusQuery()
    const [startOnboarding, { isLoading: isStarting }] = useStartStripeConnectOnboardingMutation()

    const handleConnect = async () => {
        try {
            const result = await startOnboarding().unwrap()
            window.location.assign(result.url)
        } catch (error) {
            toast.error(getApiErrorMessage(error, t('common.tryAgainLater')))
        }
    }

    const isReady = Boolean(data?.payoutsEnabled && data?.chargesEnabled)

    return (
        <section className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold">{t('stripeConnect.title')}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t('stripeConnect.description')}</p>
                </div>
                {isReady ? (
                    <CheckCircle2 className="size-5 text-status-success-foreground" aria-hidden="true" />
                ) : (
                    <AlertCircle className="size-5 text-status-warning-foreground" aria-hidden="true" />
                )}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted-foreground">
                    {isLoading ? t('stripeConnect.checking') : isReady ? t('stripeConnect.ready') : t('stripeConnect.incomplete')}
                </span>
                {!isReady && (
                    <Button
                        type="button"
                        onClick={handleConnect}
                        loading={isStarting}
                        className="gap-2"
                    >
                        {!isStarting && <ExternalLink className="size-4" aria-hidden="true" />}
                        {isStarting ? t('stripeConnect.opening') : t('stripeConnect.connectAction')}
                    </Button>
                )}
                {data?.connected && !isReady && (
                    <button type="button" onClick={() => void refetch()} className="text-sm underline underline-offset-4">
                        {t('stripeConnect.refreshAction')}
                    </button>
                )}
            </div>
        </section>
    )
}
