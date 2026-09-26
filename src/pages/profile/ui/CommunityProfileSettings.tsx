import { useState } from 'react'
import { BadgeCheck, ExternalLink, LoaderCircle, LockKeyhole, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { AutoCareCommunityBadgeList, useGetMyAutoCareCommunityProfileQuery, useUpdateMyAutoCareCommunityProfileMutation, type AutoCareCommunityProfile } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

const badgeCodes: AutoCareCommunityProfile['badgeCodes'] = ['verified_client', 'regular_client', 'helpful_reviewer', 'autocare_expert']

export function CommunityProfileSettings() {
    const { t } = useTranslation()
    const query = useGetMyAutoCareCommunityProfileQuery()
    const [updateProfile, updateState] = useUpdateMyAutoCareCommunityProfileMutation()
    const profile = query.data
    const [editedDisplayName, setEditedDisplayName] = useState<string | undefined>()
    const displayName = editedDisplayName ?? profile?.displayName ?? ''

    const save = async (payload: { enabled?: boolean; displayName?: string | null }) => {
        try {
            const updatedProfile = await updateProfile(payload).unwrap()
            setEditedDisplayName(updatedProfile.displayName ?? '')
            toast.success(t('profile.community.saved'))
        } catch (error) {
            toast.error(getApiErrorMessage(error, t('profile.community.saveError')))
        }
    }

    if (query.isLoading) return <section aria-busy="true" className="rounded-[var(--radius-panel)] border border-border bg-card p-6 shadow-sm"><p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />{t('profile.community.loading')}</p></section>
    if (query.isError || !profile) return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{t('profile.community.error')}</p><button type="button" onClick={() => void query.refetch()} className={buttonVariants({ variant: 'outline', size: 'sm' })}>{t('common.retry')}</button></div></section>

    const sharingToggleId = 'community-profile-sharing'
    const metrics = [
        ['confirmedVisits', profile.metrics.confirmedVisits],
        ['publishedReviews', profile.metrics.publishedReviews],
        ['helpfulVoters', profile.metrics.helpfulVoters],
    ] as const

    return <section data-testid="community-profile-settings" className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm sm:p-6">
        <header className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><Sparkles className="size-5" aria-hidden="true" /></span>
            <div className="min-w-0">
                <h2 className="text-lg font-black tracking-tight text-foreground">{t('profile.community.title')}</h2>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">{t('profile.community.description')}</p>
            </div>
        </header>

        <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="grid gap-1.5 text-sm font-bold text-foreground" htmlFor="community-display-name">
                {t('profile.community.displayName')}
                <input id="community-display-name" value={displayName} onChange={(event) => setEditedDisplayName(event.target.value)} maxLength={40} autoComplete="nickname" placeholder={t('profile.community.displayNamePlaceholder')} className="h-11 w-full rounded-[var(--radius-control)] border border-border bg-background px-3 font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" />
                <span className="text-xs font-medium text-muted-foreground">{t('profile.community.displayNameHint')}</span>
            </label>
            {profile.enabled && displayName.trim() !== (profile.displayName ?? '') && <button type="button" disabled={updateState.isLoading || displayName.trim().length < 2} onClick={() => void save({ displayName })} className={buttonVariants({ variant: 'outline' })}>{updateState.isLoading && <LoaderCircle className="size-4 animate-spin" />}{t('profile.community.saveName')}</button>}
        </div>

        <div className="mt-4 rounded-[var(--radius-card)] border border-border bg-background p-4">
            <label htmlFor={sharingToggleId} className="flex cursor-pointer items-start gap-3">
                <input id={sharingToggleId} type="checkbox" role="switch" checked={profile.enabled} disabled={updateState.isLoading || (!profile.enabled && displayName.trim().length < 2)} onChange={(event) => void save({ enabled: event.target.checked, ...(event.target.checked ? { displayName } : {}) })} className="mt-1 size-4 shrink-0 accent-primary" />
                <span className="min-w-0">
                    <span className="block text-sm font-bold text-foreground">{t('profile.community.shareLabel')}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">{t('profile.community.shareDescription')}</span>
                </span>
            </label>
            <p className="mt-3 flex items-start gap-2 border-t border-border pt-3 text-xs leading-5 text-muted-foreground"><LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-primary" />{t('profile.community.privacyNote')}</p>
            {!profile.enabled && <p className="mt-2 text-xs font-semibold text-muted-foreground">{t('profile.community.consentRequired')}</p>}
            {profile.profileUrl && <Link to={profile.profileUrl} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-3 gap-2')}><ExternalLink className="size-3.5" />{t('profile.community.publicLink')}</Link>}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {metrics.map(([key, value]) => <div key={key} className="rounded-[var(--radius-control)] border border-border bg-background px-3 py-3"><strong className="block text-xl font-black tabular-nums text-foreground">{value}</strong><span className="mt-1 block text-xs leading-4 text-muted-foreground">{t(`profile.community.metrics.${key}`)}</span></div>)}
        </div>

        <div className="mt-5 border-t border-border pt-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-foreground"><BadgeCheck className="size-4 text-primary" />{t('profile.community.badgesTitle')}</h3>
            {profile.badgeCodes.length ? <AutoCareCommunityBadgeList badgeCodes={profile.badgeCodes} profileId={profile.publicProfileId} /> : <p className="mt-2 text-xs leading-5 text-muted-foreground">{t('profile.community.noBadges')}</p>}
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {badgeCodes.map((code) => {
                    const earned = profile.badgeCodes.includes(code)
                    return <li key={code} className={`rounded-[var(--radius-control)] border px-3 py-2 ${earned ? 'border-primary/20 bg-primary/5' : 'border-border bg-background'}`}>
                        <span className="block text-xs font-bold text-foreground">{t(`profile.community.badges.${code}.title`)}{earned ? ` · ${t('profile.community.earned')}` : ''}</span>
                        <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{t(`profile.community.badges.${code}.goal`)}</span>
                    </li>
                })}
            </ul>
        </div>
    </section>
}
