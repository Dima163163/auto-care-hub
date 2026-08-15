import { ArrowRight, Building2, CalendarClock, CircleCheck, RotateCcw } from 'lucide-react'
import { Link } from 'react-router'

import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

import { useRecordOwnerActionCenterEventMutation, type OwnerActionCenterEventName } from '../api/ownerActionCenterApi'
import type { OwnerActionSummary } from '../lib/buildOwnerActionSummary'

type OwnerActionCenterProps = {
    summary: OwnerActionSummary
}

export function OwnerActionCenter({ summary }: OwnerActionCenterProps) {
    const { t } = useTranslation()
    const [recordAction] = useRecordOwnerActionCenterEventMutation()
    const items = [
        {
            key: 'pending-bookings',
            action: 'pending_bookings' as const,
            count: summary.pendingBookings,
            overdue: summary.pendingBookingsOlderThan24Hours,
            href: ROUTES.ownerBookings,
            icon: CalendarClock,
            title: t('ownerDashboard.actionCenter.pendingBookings'),
            description: t('ownerDashboard.actionCenter.pendingBookingsDescription'),
        },
        {
            key: 'reschedule-requests',
            action: 'reschedule_requests' as const,
            count: summary.pendingReschedules,
            overdue: summary.pendingReschedulesOlderThan24Hours,
            href: ROUTES.ownerBookings,
            icon: RotateCcw,
            title: t('ownerDashboard.actionCenter.rescheduleRequests'),
            description: t('ownerDashboard.actionCenter.rescheduleRequestsDescription'),
        },
        {
            key: 'draft-cabinets',
            action: 'draft_cabinets' as const,
            count: summary.draftCabinets,
            overdue: 0,
            href: ROUTES.ownerCabinets,
            icon: Building2,
            title: t('ownerDashboard.actionCenter.draftCabinets'),
            description: t('ownerDashboard.actionCenter.draftCabinetsDescription'),
        },
        {
            key: 'blocked-cabinets',
            action: 'blocked_cabinets' as const,
            count: summary.blockedCabinets,
            overdue: 0,
            href: ROUTES.ownerCabinets,
            icon: Building2,
            title: t('ownerDashboard.actionCenter.blockedCabinets'),
            description: t('ownerDashboard.actionCenter.blockedCabinetsDescription'),
        },
    ].filter((item) => item.count > 0)

    return (
        <section className="mb-6 rounded-2xl border bg-card p-4 shadow-sm md:p-5" aria-labelledby="owner-action-center-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{t('ownerDashboard.actionCenter.eyebrow')}</p>
                    <h2 id="owner-action-center-title" className="mt-1 text-lg font-bold tracking-tight">{t('ownerDashboard.actionCenter.title')}</h2>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t('ownerDashboard.actionCenter.description')}</p>
                </div>
                {items.length === 0 && <CircleCheck className="size-6 shrink-0 text-status-success-foreground" aria-label={t('ownerDashboard.actionCenter.allClear')} />}
            </div>

            {items.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">{t('ownerDashboard.actionCenter.allClear')}</p>
            ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map((item) => {
                        const Icon = item.icon

                        return (
                            <Link
                                key={item.key}
                                to={item.href}
                                onClick={() => {
                                    void recordAction({ action: item.action as OwnerActionCenterEventName }).unwrap().catch(() => undefined)
                                }}
                                className="group flex min-h-28 items-start gap-3 rounded-xl border px-4 py-3 transition-colors hover:border-primary/50 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <span className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary"><Icon className="size-4" aria-hidden="true" /></span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center justify-between gap-2">
                                        <span className="truncate text-sm font-semibold">{item.title}</span>
                                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold tabular-nums">{item.count}</span>
                                    </span>
                                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.description}</span>
                                    {item.overdue > 0 && <span className="mt-2 block text-xs font-semibold text-status-warning-foreground">{t('ownerDashboard.actionCenter.olderThan24Hours', { count: item.overdue })}</span>}
                                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">{t('ownerDashboard.actionCenter.open')} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
                                </span>
                            </Link>
                        )
                    })}
                </div>
            )}
        </section>
    )
}
