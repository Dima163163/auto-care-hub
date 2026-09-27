import { BadgeCheck, CarFront, LoaderCircle, MessageSquareText, Sparkles, UserRound } from 'lucide-react'
import { useParams } from 'react-router'

import { AutoCareCommunityBadgeList, useGetPublicAutoCareCommunityProfileQuery } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'
import { AutoCareImage } from '@/shared/ui/autocare-image'
import { StateCard } from '@/shared/ui/state-card'

export function CommunityClientProfilePage() {
    const { profileId = '' } = useParams()
    const { t } = useTranslation()
    const query = useGetPublicAutoCareCommunityProfileQuery(profileId, { skip: !profileId })
    const profile = query.data

    if (query.isLoading) return <main className="mx-auto max-w-3xl px-[var(--layout-gutter)] py-12"><div aria-busy="true" className="rounded-[var(--radius-panel)] border border-border bg-card p-8"><LoaderCircle className="size-5 animate-spin text-primary" /><span className="sr-only">{t('common.loading')}</span></div></main>
    if (query.isError || !profile) return <main className="mx-auto max-w-3xl px-[var(--layout-gutter)] py-12"><StateCard variant="empty" title={t('profile.community.profileUnavailable')} description={t('profile.community.privacyNote')} /></main>

    const metrics = [
        { key: 'confirmedVisits', value: profile.metrics.confirmedVisits, icon: CarFront },
        { key: 'publishedReviews', value: profile.metrics.publishedReviews, icon: MessageSquareText },
        { key: 'helpfulVoters', value: profile.metrics.helpfulVoters, icon: Sparkles },
    ] as const

    return <main className="mx-auto max-w-3xl px-[var(--layout-gutter)] py-8 sm:py-12">
        <section className="overflow-hidden rounded-[var(--radius-panel)] border border-border bg-card shadow-sm">
            <div className="h-2 bg-gradient-to-r from-primary via-sky-400 to-primary/50" />
            <div className="p-5 sm:p-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    {profile.avatarUrl ? <AutoCareImage src={profile.avatarUrl} alt="" className="size-20 rounded-full border-4 border-background object-cover shadow-md" /> : <span className="flex size-20 shrink-0 items-center justify-center rounded-full border-4 border-background bg-primary/10 text-primary shadow-md"><UserRound className="size-9" aria-hidden="true" /></span>}
                    <div className="min-w-0">
                        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary"><BadgeCheck className="size-4" />{t('profile.community.publicTitle')}</p>
                        <h1 className="mt-1 break-words text-2xl font-black tracking-tight text-foreground sm:text-3xl">{profile.displayName}</h1>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{t('profile.community.publicDescription')}</p>
                    </div>
                </div>

                {profile.badgeCodes.length > 0 && <div className="mt-6 rounded-[var(--radius-card)] border border-primary/15 bg-primary/5 p-4"><h2 className="mb-3 text-sm font-bold text-foreground">{t('profile.community.badgesTitle')}</h2><AutoCareCommunityBadgeList badgeCodes={profile.badgeCodes} profileId={profile.profileId} /></div>}

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {metrics.map(({ key, value, icon: Icon }) => <article key={key} className="rounded-[var(--radius-card)] border border-border bg-background p-4"><Icon className="size-4 text-primary" aria-hidden="true" /><strong className="mt-3 block text-2xl font-black tabular-nums text-foreground">{value}</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">{t(`profile.community.metrics.${key}`)}</span></article>)}
                </div>
            </div>
        </section>
    </main>
}
