import { Bell, BellRing, CheckCheck, Circle } from 'lucide-react'
import { Link } from 'react-router'
import { useDispatch } from 'react-redux'
import { toast } from 'sonner'
import { useState } from 'react'

import {
    useGetNotificationsQuery,
    useGetUnreadNotificationsCountQuery,
    useLazyGetNotificationsQuery,
    useMarkAllNotificationsReadMutation,
    useMarkNotificationReadMutation,
    type Notification,
    notificationsApi,
} from '@/entities/notification'
import type { AppDispatch } from '@/app/store'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { StateCard } from '@/shared/ui/state-card'
import { QueryRefreshStatus } from '@/shared/ui/query-refresh-status'
import { QueryRefreshError, RetryButton } from '@/shared/ui/query-refresh-error'
import { formatDateTime } from '@/shared/lib/formatDateTime'

function NotificationLink({
    notification,
    label,
}: {
    notification: Notification
    label: string
}) {
    if (!notification.link) {
        return null
    }

    return (
        <Link
            to={notification.link}
        className="text-sm font-bold text-primary hover:underline"
        >
            {label}
        </Link>
    )
}

const notificationQuery = { limit: 20 }

export function NotificationsPage() {
    const { t } = useTranslation()
    const dispatch = useDispatch<AppDispatch>()
    const {
        data: notificationPage,
        error,
        isFetching,
        isLoading,
        refetch,
    } = useGetNotificationsQuery(notificationQuery)
    const { data: unreadCountResponse } = useGetUnreadNotificationsCountQuery()
    const [loadMoreNotifications, { isFetching: isLoadingMore }] =
        useLazyGetNotificationsQuery()
    const [markRead, { isLoading: isMarkingRead }] = useMarkNotificationReadMutation()
    const [markAllRead, { isLoading: isMarkingAllRead }] = useMarkAllNotificationsReadMutation()
    const [markingNotificationId, setMarkingNotificationId] = useState<string | null>(null)
    const [additionalNotifications, setAdditionalNotifications] = useState<Notification[]>([])
    const [loadedNextCursor, setLoadedNextCursor] = useState<string | null | undefined>(undefined)
    const nextCursor = loadedNextCursor === undefined
        ? notificationPage?.nextCursor ?? null
        : loadedNextCursor
    const notifications = [
        ...(notificationPage?.items ?? []),
        ...additionalNotifications,
    ]
    const localUnreadCount = notifications.filter((notification) => !notification.readAt).length
    const unreadCount = unreadCountResponse?.count ?? localUnreadCount
    const hasStaleNotifications = notifications.length > 0

    const handleRefresh = () => {
        setAdditionalNotifications([])
        setLoadedNextCursor(undefined)
        return refetch()
    }

    const handleMarkRead = async (notificationId: string) => {
        setMarkingNotificationId(notificationId)
        const readAt = new Date().toISOString()
        const notificationPatch = dispatch(
            notificationsApi.util.updateQueryData('getNotifications', notificationQuery, (draft) => {
                const notification = draft.items.find((item) => item.id === notificationId)
                if (notification) notification.readAt = readAt
            }),
        )
        const unreadCountPatch = dispatch(
            notificationsApi.util.updateQueryData('getUnreadNotificationsCount', undefined, (draft) => {
                draft.count = Math.max(0, draft.count - 1)
            }),
        )
        const previousAdditionalNotifications = additionalNotifications
        setAdditionalNotifications((current) => current.map((notification) =>
            notification.id === notificationId
                ? { ...notification, readAt }
                : notification,
        ))

        try {
            await markRead(notificationId).unwrap()
        } catch (error) {
            notificationPatch.undo()
            unreadCountPatch.undo()
            setAdditionalNotifications(previousAdditionalNotifications)
            toast.error(getApiErrorMessage(error, t('notifications.updateError')))
        } finally {
            setMarkingNotificationId(null)
        }
    }

    const handleMarkAllRead = async () => {
        const readAt = new Date().toISOString()
        const notificationPatch = dispatch(
            notificationsApi.util.updateQueryData('getNotifications', notificationQuery, (draft) => {
                draft.items.forEach((notification) => {
                    notification.readAt ??= readAt
                })
            }),
        )
        const unreadCountPatch = dispatch(
            notificationsApi.util.updateQueryData('getUnreadNotificationsCount', undefined, (draft) => {
                draft.count = 0
            }),
        )
        const previousAdditionalNotifications = additionalNotifications
        setAdditionalNotifications((current) => current.map((notification) => ({
            ...notification,
            readAt: notification.readAt ?? readAt,
        })))

        try {
            await markAllRead().unwrap()
        } catch (error) {
            notificationPatch.undo()
            unreadCountPatch.undo()
            setAdditionalNotifications(previousAdditionalNotifications)
            toast.error(getApiErrorMessage(error, t('notifications.updateError')))
        }
    }

    const handleLoadMore = async () => {
        if (!nextCursor || isLoadingMore) return

        try {
            const page = await loadMoreNotifications({
                cursor: nextCursor,
                limit: notificationQuery.limit,
            }).unwrap()

            setAdditionalNotifications((current) => [
                ...current,
                ...page.items.filter((item) => !current.some((existing) => existing.id === item.id)),
            ])
            setLoadedNextCursor(page.nextCursor)
        } catch (error) {
            toast.error(getApiErrorMessage(error, t('notifications.updateError')))
        }
    }

    return (
        <main className="relative z-0 min-h-full bg-background px-5 py-8 text-foreground lg:px-8">
            <section
                className="mx-auto max-w-4xl"
                aria-busy={isLoading || isFetching}
            >
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    {t('notifications.eyebrow')}
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                    {t('notifications.title')}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                    {t('notifications.description')}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                    <span className="rounded-md bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
                        {t('notifications.unreadCount', { count: unreadCount })}
                    </span>

                    <Button
                        type="button"
                        variant="outline"
                        disabled={unreadCount === 0}
                        loading={isMarkingAllRead}
                        onClick={() => void handleMarkAllRead()}
                    >
                        {!isMarkingAllRead && <CheckCheck className="size-4" />}
                        {isMarkingAllRead
                            ? t('notifications.markingRead')
                            : t('notifications.markAllRead')}
                    </Button>
                </div>

                <QueryRefreshStatus
                    isRefreshing={isFetching && !isLoading}
                    label={t('common.refreshing')}
                />

                {error && hasStaleNotifications && (
                    <QueryRefreshError
                        message={getApiErrorMessage(
                            error,
                            t('common.tryAgainLater'),
                        )}
                        onRetry={handleRefresh}
                        retryLabel={t('common.retry')}
                    />
                )}

                {isLoading && (
                    <div className="mt-10">
                        <StateCard variant="loading" description={t('common.loading')} />
                    </div>
                )}

                {error && !hasStaleNotifications && (
                    <div className="mt-10">
                        <StateCard
                            title={t('common.failedToLoad')}
                            description={getApiErrorMessage(error, t('common.tryAgainLater'))}
                            action={
                                <RetryButton onRetry={handleRefresh} label={t('common.retry')} />
                            }
                        />
                    </div>
                )}

                {!isLoading && !error && notifications.length === 0 && (
                    <div className="mt-10">
                        <StateCard
                            title={t('notifications.emptyTitle')}
                            description={t('notifications.emptyDescription')}
                        />
                    </div>
                )}

                <div className="mt-10 grid gap-4">
                    {notifications.map((notification) => (
                        <article
                            key={notification.id}
                            className="flex gap-4 rounded-lg border bg-card p-5 shadow-sm"
                        >
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                {notification.readAt
                                    ? <Bell className="size-5" />
                                    : <BellRing className="size-5" />}
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <h2 className="text-lg font-black">{notification.title}</h2>
                                    <span className="text-xs font-bold text-muted-foreground">
                                        {formatDateTime(notification.createdAt)}
                                    </span>
                                    {!notification.readAt && (
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                                            <Circle className="size-2 fill-current" />
                                            {t('notifications.unread')}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
                                    {notification.message}
                                </p>
                                <div className="mt-4 flex flex-wrap items-center gap-3">
                                    <NotificationLink
                                        notification={notification}
                                        label={t('notifications.open')}
                                    />
                                    {!notification.readAt && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                className="font-bold text-muted-foreground hover:text-foreground"
                                                loading={isMarkingRead && markingNotificationId === notification.id}
                                                onClick={() => void handleMarkRead(notification.id)}
                                            >
                                            {t('notifications.markRead')}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>

                {nextCursor && (
                    <Button
                        type="button"
                        variant="outline"
                        className="mt-6"
                        loading={isLoadingMore}
                        onClick={() => void handleLoadMore()}
                    >
                        {isLoadingMore
                            ? t('notifications.loadingMore')
                            : t('notifications.loadMore')}
                    </Button>
                )}

                <Link
                    to={ROUTES.profile}
                    className="mt-8 inline-flex rounded-md border border-primary px-6 py-3 text-sm font-bold text-primary"
                >
                    {t('notifications.managePreferences')}
                </Link>
            </section>
        </main>
    )
}
