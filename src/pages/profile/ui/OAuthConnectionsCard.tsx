import { Link2, ShieldCheck, Unlink2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
    useGetOAuthIdentitiesQuery,
    useGetOAuthLinkUrlMutation,
    useGetOAuthUnlinkUrlMutation,
} from '@/features/auth'
import type { OAuthIdentitySummary } from '@/features/auth'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { QueryRefreshStatus } from '@/shared/ui/query-refresh-status'
import { RetryButton } from '@/shared/ui/query-refresh-error'

const PROVIDERS: OAuthIdentitySummary['provider'][] = ['google', 'yandex']

export function OAuthConnectionsCard() {
    const { t } = useTranslation()
    const [searchParams, setSearchParams] = useSearchParams()
    const [activeProvider, setActiveProvider] = useState<string | null>(null)
    const {
        data: identities = [],
        isError,
        isFetching,
        isLoading,
        refetch,
    } =
        useGetOAuthIdentitiesQuery()
    const [startLink] = useGetOAuthLinkUrlMutation()
    const [startUnlink] = useGetOAuthUnlinkUrlMutation()

    const identitiesByProvider = useMemo(
        () => new Map(identities.map((identity) => [identity.provider, identity])),
        [identities]
    )

    useEffect(() => {
        const status = searchParams.get('oauth')

        if (!status) {
            return
        }

        if (status === 'linked') {
            toast.success(t('profile.oauth.linkSuccess'))
        } else if (status === 'unlinked') {
            toast.success(t('profile.oauth.unlinkSuccess'))
        } else if (status === 'link_failed' || status === 'unlink_failed') {
            toast.error(t('profile.oauth.actionFailed'))
        }

        const nextSearchParams = new URLSearchParams(searchParams)
        nextSearchParams.delete('oauth')
        nextSearchParams.delete('provider')
        nextSearchParams.set('tab', 'security')
        setSearchParams(nextSearchParams, { replace: true })
    }, [searchParams, setSearchParams, t])

    const startOAuthAction = async (
        provider: OAuthIdentitySummary['provider'],
        action: 'link' | 'unlink'
    ) => {
        setActiveProvider(provider)

        try {
            const result = action === 'link'
                ? await startLink({ provider }).unwrap()
                : await startUnlink({ provider }).unwrap()

            window.location.assign(result.authUrl)
        } catch (error) {
            toast.error(
                getApiErrorMessage(error, t('profile.oauth.actionFailed'))
            )
            setActiveProvider(null)
        }
    }

    return (
        <section
            className="rounded-xl border bg-card p-6 shadow-sm"
            aria-busy={isLoading || isFetching}
        >
            <QueryRefreshStatus
                isRefreshing={isFetching && !isLoading}
                label={t('common.refreshing')}
            />
            <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ShieldCheck className="size-5" aria-hidden="true" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold tracking-tight">
                        {t('profile.oauth.title')}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t('profile.oauth.description')}
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="mt-6 grid gap-3" aria-label={t('common.loading')}>
                    {PROVIDERS.map((provider) => (
                        <div
                            key={provider}
                            className="h-16 animate-pulse rounded-xl bg-muted"
                        />
                    ))}
                </div>
            ) : isError ? (
                <div
                    className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4"
                    role="alert"
                >
                    <p className="text-sm text-destructive">
                        {t('profile.oauth.loadError')}
                    </p>
                    <RetryButton size="sm" className="mt-3" onRetry={refetch} label={t('common.retry')} />
                </div>
            ) : (
                <div className="mt-6 grid gap-3">
                    {PROVIDERS.map((provider) => {
                        const identity = identitiesByProvider.get(provider)
                        const isActive = activeProvider === provider
                        const isMultiple = Boolean(
                            identity?.identityCount && identity.identityCount > 1
                        )

                        return (
                            <div
                                key={provider}
                                className="flex flex-col gap-3 rounded-xl border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0">
                                    <p className="font-medium">
                                        {provider === 'google' ? 'Google' : 'Yandex'}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {identity?.isLinked
                                            ? t('profile.oauth.connected')
                                            : t('profile.oauth.notConnected')}
                                    </p>
                                    {isMultiple && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {t('profile.oauth.multipleIdentities')}
                                        </p>
                                    )}
                                    {identity?.isLinked && !identity.canUnlink && !isMultiple && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {t('profile.oauth.lastMethodNotice')}
                                        </p>
                                    )}
                                </div>

                                {identity?.isLinked ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={isActive || !identity.canUnlink || isMultiple}
                                        onClick={() => void startOAuthAction(provider, 'unlink')}
                                    >
                                        <Unlink2 aria-hidden="true" />
                                        {isActive
                                            ? t('profile.oauth.opening')
                                            : t('profile.oauth.unlink')}
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={isActive}
                                        onClick={() => void startOAuthAction(provider, 'link')}
                                    >
                                        <Link2 aria-hidden="true" />
                                        {isActive
                                            ? t('profile.oauth.opening')
                                            : t('profile.oauth.link')}
                                    </Button>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </section>
    )
}
