import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { Link, Navigate } from 'react-router'
import {
    Building2,
    CalendarCheck,
    CalendarClock,
    ClipboardList,
    Search,
    UserRound,
} from 'lucide-react'

import { buttonVariants } from '@/components/ui/button-variants'
import { useGetMeQuery } from '@/features/auth'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/shared/constants/routes'
import type { TranslationKey } from '@/shared/lib/i18n'
import { useTranslation } from '@/shared/lib/useTranslation'
import { StateCard } from '@/shared/ui/state-card'

import {
    addCompletedOnboardingStep,
    getOnboardingProgressStorageKey,
    readOnboardingProgress,
    writeOnboardingProgress,
    type OnboardingRole,
} from '../model/onboardingProgress'

type OnboardingAction = {
    descriptionKey: TranslationKey
    icon: ComponentType<{ className?: string }>
    labelKey: TranslationKey
    titleKey: TranslationKey
    to: string
}

const clientActions: OnboardingAction[] = [
    {
        titleKey: 'onboarding.client.findCabinetTitle',
        descriptionKey: 'onboarding.client.findCabinetDescription',
        labelKey: 'onboarding.client.findCabinetAction',
        to: ROUTES.cabinets,
        icon: Search,
    },
    {
        titleKey: 'onboarding.client.bookingsTitle',
        descriptionKey: 'onboarding.client.bookingsDescription',
        labelKey: 'onboarding.client.bookingsAction',
        to: ROUTES.profileBookings,
        icon: CalendarCheck,
    },
    {
        titleKey: 'onboarding.client.profileTitle',
        descriptionKey: 'onboarding.client.profileDescription',
        labelKey: 'onboarding.client.profileAction',
        to: ROUTES.profile,
        icon: UserRound,
    },
]

const ownerActions: OnboardingAction[] = [
    {
        titleKey: 'onboarding.owner.createCabinetTitle',
        descriptionKey: 'onboarding.owner.createCabinetDescription',
        labelKey: 'onboarding.owner.createCabinetAction',
        to: ROUTES.ownerCabinetCreate,
        icon: Building2,
    },
    {
        titleKey: 'onboarding.owner.servicesTitle',
        descriptionKey: 'onboarding.owner.servicesDescription',
        labelKey: 'onboarding.owner.servicesAction',
        to: ROUTES.ownerServices,
        icon: ClipboardList,
    },
    {
        titleKey: 'onboarding.owner.bookingsTitle',
        descriptionKey: 'onboarding.owner.bookingsDescription',
        labelKey: 'onboarding.owner.bookingsAction',
        to: ROUTES.ownerBookings,
        icon: CalendarClock,
    },
]

export function OnboardingPage() {
    const { t } = useTranslation()
    const {
        data: user,
        isError,
        isLoading,
    } = useGetMeQuery()
    const isOwner = user?.role === 'owner'
    const actions = isOwner ? ownerActions : clientActions
    const onboardingRole: OnboardingRole = isOwner ? 'owner' : 'client'
    const progressStorageKey = user
        ? getOnboardingProgressStorageKey(user.id, onboardingRole)
        : ''
    const actionIds = useMemo(() => actions.map((action) => action.to), [actions])
    const [progressByStorageKey, setProgressByStorageKey] = useState<Record<string, string[]>>({})
    const completedSteps = useMemo(
        () => progressStorageKey
            ? progressByStorageKey[progressStorageKey] ?? readOnboardingProgress(progressStorageKey)
            : [],
        [progressByStorageKey, progressStorageKey],
    )

    useEffect(() => {
        if (!progressStorageKey) return
        writeOnboardingProgress(progressStorageKey, completedSteps)
    }, [completedSteps, progressStorageKey])

    if (isLoading) {
        return (
            <main className="relative z-0 min-h-full bg-background px-4 py-8 lg:px-8">
                <section className="mx-auto max-w-6xl">
                    <StateCard variant="loading" description={t('common.loadingPage')} />
                </section>
            </main>
        )
    }

    if (isError || !user) {
        return <Navigate to={ROUTES.login} replace />
    }

    if (user.role === 'admin' || user.role === 'super_admin') {
        return <Navigate to={ROUTES.adminDashboard} replace />
    }

    const primaryAction = actions[0]
    if (!primaryAction) {
        return null
    }
    const dashboardLink = isOwner ? ROUTES.ownerDashboard : ROUTES.profile
    const completedActionIds = new Set(completedSteps)
    const completedCount = actionIds.filter((actionId) => completedActionIds.has(actionId)).length
    const completionPercent = Math.round((completedCount / Math.max(actions.length, 1)) * 100)
    const markStepCompleted = (stepId: string) => {
        setProgressByStorageKey((currentProgress) => {
            const existingSteps = progressStorageKey
                ? currentProgress[progressStorageKey] ?? readOnboardingProgress(progressStorageKey)
                : []

            return progressStorageKey
                ? {
                    ...currentProgress,
                    [progressStorageKey]: addCompletedOnboardingStep(existingSteps, stepId),
                }
                : currentProgress
        })
    }

    return (
            <main className="relative z-0 min-h-full bg-background px-4 py-8 lg:px-8">
            <section className="mx-auto grid max-w-6xl gap-8 lg:px-4">
                <div className="grid gap-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                        {t('onboarding.eyebrow')} · {t('onboarding.progress', {
                            completed: completedCount,
                            total: actions.length,
                        })}
                    </p>

                    <div className="grid gap-3 md:max-w-3xl">
                        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                            {t(isOwner ? 'onboarding.owner.title' : 'onboarding.client.title', {
                                name: user.name,
                            })}
                        </h1>

                        <p className="text-base leading-7 text-muted-foreground md:text-lg">
                            {t(isOwner ? 'onboarding.owner.description' : 'onboarding.client.description')}
                        </p>
                    </div>

                    <div className="max-w-xl" aria-label={t('onboarding.progress', {
                        completed: completedCount,
                        total: actions.length,
                    })}>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full rounded-full bg-primary transition-[width] duration-300"
                                style={{ width: `${completionPercent}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {actions.map((action, index) => {
                        const Icon = action.icon

                        return (
                            <article
                                key={action.to}
                                className="grid gap-5 rounded-xl border bg-card p-6 shadow-sm"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <Icon className="size-6" />
                                    </div>

                                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                                        {completedActionIds.has(action.to)
                                            ? t('onboarding.completedStep')
                                            : t('onboarding.step', { count: index + 1 })}
                                    </span>
                                </div>

                                <div className="grid gap-2">
                                    <h2 className="text-lg font-semibold text-foreground">
                                        {t(action.titleKey)}
                                    </h2>

                                    <p className="text-sm leading-6 text-muted-foreground">
                                        {t(action.descriptionKey)}
                                    </p>
                                </div>

                                <Link
                                    to={action.to}
                                    onClick={() => markStepCompleted(action.to)}
                                    className={cn(
                                        buttonVariants({
                                            variant: index === 0 ? 'default' : 'outline',
                                        }),
                                        'mt-auto w-full'
                                    )}
                                >
                                    {t(action.labelKey)}
                                </Link>
                            </article>
                        )
                    })}
                </div>

                <div className="flex flex-wrap gap-3">
                    <Link
                        to={primaryAction.to}
                        onClick={() => markStepCompleted(primaryAction.to)}
                        className={buttonVariants({ size: 'lg' })}
                    >
                        {t(primaryAction.labelKey)}
                    </Link>

                    <Link
                        to={dashboardLink}
                        className={buttonVariants({
                            size: 'lg',
                            variant: 'outline',
                        })}
                    >
                        {t(isOwner ? 'onboarding.owner.skipAction' : 'onboarding.client.skipAction')}
                    </Link>
                </div>
            </section>
        </main>
    )
}
