import { toast } from 'sonner'
import { Monitor, Smartphone, Globe, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
    useGetSessionsQuery,
    useRevokeAllSessionsMutation,
    useRevokeSessionMutation,
    type UserSession,
} from '@/features/auth'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import type { TranslationKey } from '@/shared/lib/i18n'
import { useTranslation } from '@/shared/lib/useTranslation'
import { QueryRefreshStatus } from '@/shared/ui/query-refresh-status'
import { RetryButton } from '@/shared/ui/query-refresh-error'

function getDeviceIcon(userAgent: string | null) {
    if (!userAgent) return Globe
    const ua = userAgent.toLowerCase()
    if (ua.includes('mobi') || ua.includes('android') || ua.includes('iphone')) {
        return Smartphone
    }
    return Monitor
}

function simplifyUserAgent(
    userAgent: string | null,
    t: (key: TranslationKey) => string,
) {
    if (!userAgent) return t('auth.unknownDevice')
    
    const ua = userAgent.toLowerCase()
    let os = t('auth.unknownOs')
    if (ua.includes('win')) os = 'Windows'
    else if (ua.includes('mac')) os = 'macOS'
    else if (ua.includes('linux')) os = 'Linux'
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS'
    else if (ua.includes('android')) os = 'Android'

    let browser = t('auth.unknownBrowser')
    if (ua.includes('edg')) browser = 'Edge'
    else if (ua.includes('chrome')) browser = 'Chrome'
    else if (ua.includes('firefox')) browser = 'Firefox'
    else if (ua.includes('safari')) browser = 'Safari'
    else if (ua.includes('edge')) browser = 'Edge'
    
    return `${browser} on ${os}`
}

export function SessionsList() {
    const { t } = useTranslation()
    const {
        data: sessions = [],
        isError,
        isFetching,
        isLoading,
        refetch,
    } = useGetSessionsQuery()
    const [revokeSession, { isLoading: isRevoking }] = useRevokeSessionMutation()
    const [revokeAll, { isLoading: isRevokingAll }] = useRevokeAllSessionsMutation()

    const onRevokeSession = async (id: string) => {
        try {
            await revokeSession(id).unwrap()
            toast.success(t('auth.revokeSessionSuccess'))
        } catch (error) {
            toast.error(
                getApiErrorMessage(error, t('auth.revokeSessionFailed'))
            )
        }
    }

    const onRevokeAll = async () => {
        try {
            await revokeAll().unwrap()
            toast.success(t('auth.revokeAllSessionsSuccess'))
        } catch (error) {
            toast.error(
                getApiErrorMessage(error, t('auth.revokeAllSessionsFailed'))
            )
        }
    }

    if (isLoading) {
        return (
            <section role="status" className="rounded-xl border bg-card p-6 shadow-sm">
                <span className="sr-only">{t('common.loading')}</span>
                <div className="space-y-3">
                    <Skeleton className="h-6 w-2/5" />
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-16 w-full" />
                </div>
            </section>
        )
    }

    if (isError) {
        return (
            <section className="rounded-xl border bg-card p-6 shadow-sm">
                <p className="text-destructive">{t('common.failedToLoad')}</p>
                <RetryButton className="mt-4" onRetry={refetch} label={t('common.retry')} />
            </section>
        )
    }

    const otherSessions = sessions.filter((s: UserSession) => !s.isCurrent)

    return (
        <section
            className="rounded-xl border bg-card p-6 shadow-sm"
            aria-busy={isFetching}
        >
            <QueryRefreshStatus
                isRefreshing={isFetching}
                label={t('common.refreshing')}
            />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight">
                        {t('auth.sessionsTitle')}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t('auth.sessionsDescription')}
                    </p>
                </div>

                {otherSessions.length > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onRevokeAll}
                        loading={isRevokingAll}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                        <Trash2 className="mr-2 size-4" />
                        {isRevokingAll ? t('auth.revokingAllSessions') : t('auth.revokeAllSessions')}
                    </Button>
                )}
            </div>

            <div className="mt-6 divide-y">
                {sessions.map((session: UserSession) => {
                    const Icon = getDeviceIcon(session.userAgent)
                    return (
                        <div
                            key={session.id}
                            className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                        >
                            <div className="flex items-center gap-4">
                                <div className="flex size-10 items-center justify-center rounded-xl border bg-muted">
                                    <Icon className="size-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium">
                                            {simplifyUserAgent(session.userAgent, t)}
                                        </p>
                                        {session.isCurrent && (
                                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">
                                                {t('auth.currentSession')}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {session.ipAddress} • {t('auth.lastActive')}: {new Date(session.lastActiveAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {!session.isCurrent && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onRevokeSession(session.id)}
                                    loading={isRevoking}
                                    className="text-muted-foreground hover:text-destructive"
                                >
                                    {isRevoking ? t('auth.revokingSession') : t('auth.revokeSession')}
                                </Button>
                            )}
                        </div>
                    )
                })}
            </div>
        </section>
    )
}
