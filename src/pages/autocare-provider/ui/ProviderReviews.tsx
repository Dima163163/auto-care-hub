import { ChevronDown, Heart, Star, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import type { QueryViewState } from '@/shared/api/query-view-state'
import { AutoCareCommunityBadgeList, automotiveServices, getServiceLabel, type ProviderReview, type ProviderProfile, useGetMyAutoCareHelpfulReviewIdsQuery, useVoteAutoCareReviewHelpfulMutation } from '@/entities/automotive-service'
import { useGetMeQuery } from '@/features/auth'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { formatAutoCareReviewCount } from '@/shared/lib/formatAutoCareCount'
import { AutoCareImage } from '@/shared/ui/autocare-image'
import { QueryStateCard } from '@/shared/ui/query-state-card'
import { StateCard } from '@/shared/ui/state-card'

type SelectOption = { value: string; label: string }
type ReviewCardProps = { review: ProviderReview }

const scoreRows = [
    { score: 5, value: 84 }, { score: 4, value: 12 }, { score: 3, value: 3 }, { score: 2, value: 1 }, { score: 1, value: 1 },
]

export function ProviderReviews({ provider, state, error, onRetry }: { provider: ProviderProfile; state: QueryViewState; error?: unknown; onRetry: () => void }) {
    const { t, locale } = useTranslation()
    const [ratingFilter, setRatingFilter] = useState('all')
    const [serviceFilter, setServiceFilter] = useState('all')
    const [sortBy, setSortBy] = useState('recommended')
    const [visibleCount, setVisibleCount] = useState(3)
    const currentUserQuery = useGetMeQuery()
    const currentUser = currentUserQuery.data
    const canVote = currentUser?.role === 'client' && currentUser.status === 'active' && Boolean(currentUser.emailVerifiedAt)
    const needsEmailVerification = currentUser?.role === 'client' && currentUser.status === 'active' && !currentUser.emailVerifiedAt
    const myVotesQuery = useGetMyAutoCareHelpfulReviewIdsQuery(provider.id, { skip: !canVote })
    const [voteForReview, voteState] = useVoteAutoCareReviewHelpfulMutation()
    const votedReviewIds = new Set(myVotesQuery.data?.reviewIds ?? [])
    const ownReviewIds = new Set(myVotesQuery.data?.ownReviewIds ?? [])
    const toggleHelpful = async (reviewId: string, wasHelpful: boolean) => {
        try {
            await voteForReview({ reviewId, providerId: provider.id, voted: !wasHelpful }).unwrap()
        } catch (voteError) {
            toast.error(getApiErrorMessage(voteError, t('profile.community.saveError')))
        }
    }
    const selectors = [
        [{ value: 'all', label: t('autocare.providerAllRatings') }, ...[5, 4, 3, 2, 1].map((score) => ({ value: String(score), label: `${score} ★` }))],
        [{ value: 'all', label: t('autocare.providerAllServices') }, ...provider.offerings.map((offering) => ({ value: offering.serviceId, label: getServiceLabel(automotiveServices.find((service) => service.id === offering.serviceId) ?? { id: offering.serviceId, icon: '•', labels: { en: offering.serviceId } }, locale) }))],
        [{ value: 'recommended', label: t('autocare.providerSortRecommended') }, { value: 'date', label: t('autocare.providerSortByDate') }],
    ] as const
    const filteredReviews = useMemo(() => {
        const reviews = provider.reviews.filter((review) => (ratingFilter === 'all' || String(Math.round(review.rating)) === ratingFilter) && (serviceFilter === 'all' || review.serviceId === serviceFilter))
        return sortBy === 'date' ? [...reviews].sort((left, right) => Date.parse(right.date) - Date.parse(left.date)) : reviews
    }, [provider.reviews, ratingFilter, serviceFilter, sortBy])

    if (state === 'loading') return <section id="reviews" aria-busy="true" className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm sm:p-6"><div className="h-6 w-44 animate-pulse rounded bg-secondary" /><div className="mt-4 h-24 w-52 animate-pulse rounded-[var(--radius-card)] bg-secondary" /><div className="mt-4 grid gap-3 md:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="min-h-36 animate-pulse rounded-[var(--radius-card)] border border-border bg-secondary" />)}</div><span className="sr-only">{t('common.loading')}</span></section>
    if (state === 'error' || state === 'offline' || state === 'permission-denied' || state === 'suspended' || state === 'session-expired') return <section id="reviews" className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm sm:p-6"><QueryStateCard state={state} error={error} onRetry={onRetry} /></section>
    if (provider.reviews.length === 0) return <section id="reviews" className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm sm:p-6">{state === 'stale-error' ? <QueryStateCard className="mb-4" state={state} error={error} onRetry={onRetry} /> : null}<h2 className="text-xl font-black tracking-tight text-foreground">{t('autocare.providerReviews')}</h2><StateCard className="mt-4" variant="empty" title={t('autocare.providerNoReviews')} description={t('autocare.providerNoReviewsDescription')} /></section>
    const visibleReviews = filteredReviews.slice(0, visibleCount)
    return <section id="reviews" className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm sm:p-6">{state === 'stale-error' ? <QueryStateCard className="mb-4" state={state} error={error} onRetry={onRetry} /> : null}<header className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black tracking-tight text-foreground">{t('autocare.providerReviews')}</h2><div className="flex flex-wrap gap-2"><ReviewSelect options={selectors[0]} value={ratingFilter} onChange={setRatingFilter} /><ReviewSelect options={selectors[1]} value={serviceFilter} onChange={setServiceFilter} /><ReviewSelect options={selectors[2]} value={sortBy} onChange={setSortBy} /></div></header><div className="mt-4"><ReviewScore provider={provider} /></div><div className="mt-4 grid gap-3 md:grid-cols-3">{visibleReviews.map((review) => <ReviewCard key={review.id} review={review} canVote={canVote} needsEmailVerification={needsEmailVerification} isSignedIn={Boolean(currentUser)} hasVoted={votedReviewIds.has(review.id)} isOwnReview={ownReviewIds.has(review.id)} isVotePending={voteState.isLoading || myVotesQuery.isLoading} onToggleHelpful={() => void toggleHelpful(review.id, votedReviewIds.has(review.id))} />)}</div>{filteredReviews.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">{t('autocare.providerNoReviews')}</p> : visibleReviews.length < filteredReviews.length ? <button type="button" onClick={() => setVisibleCount(filteredReviews.length)} className="mx-auto mt-4 inline-flex items-center gap-1 rounded-[var(--radius-control)] border border-border px-6 py-2 text-xs font-bold text-primary transition hover:border-primary"><span>{t('autocare.providerShowAllReviews', { count: filteredReviews.length })}</span><ChevronDown className="size-3.5" /></button> : null}</section>
}

function ReviewScore({ provider }: { provider: ProviderProfile }) {
    const { t, locale } = useTranslation()
    const distribution = provider.reviewDistribution
    const total = provider.reviewCount || 1
    const rows = distribution ? [5, 4, 3, 2, 1].map((score) => ({ score, value: Math.round(((distribution[String(score) as keyof typeof distribution] ?? 0) / total) * 100) })) : scoreRows
    return <div className="flex w-full items-center gap-3 rounded-[var(--radius-card)] border border-border bg-background p-3"><div className="shrink-0"><strong className="block text-3xl font-black text-foreground">{provider.rating.toFixed(1)}</strong><span className="mt-1 flex gap-0.5 text-rating-fill">{Array.from({ length: 5 }, (_, index) => <Star key={index} className="size-3 fill-rating-fill" />)}</span><span className="mt-1 block text-[10px] font-semibold text-muted-foreground">{formatAutoCareReviewCount(provider.reviewCount, locale, t)}</span></div><div className="min-w-0 flex-1 space-y-1">{rows.map((row) => <div key={row.score} className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground"><span className="w-4">{row.score} ★</span><span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full bg-rating-fill" style={{ width: `${row.value}%` }} /></span></div>)}</div></div>
}

function ReviewCard({ review, canVote, needsEmailVerification, isSignedIn, hasVoted, isOwnReview, isVotePending, onToggleHelpful }: ReviewCardProps & { canVote: boolean; needsEmailVerification: boolean; isSignedIn: boolean; hasVoted: boolean; isOwnReview: boolean; isVotePending: boolean; onToggleHelpful: () => void }) {
    const { t } = useTranslation()
    const author = review.author.trim() || t('profile.community.anonymousAuthor')
    const profileId = review.communityProfile?.profileId
    const helpfulControl = isOwnReview
        ? <span title={t('profile.community.ownReview')} className="inline-flex min-h-8 items-center gap-1.5 px-1 text-[10px] font-bold text-muted-foreground"><Heart className="size-3.5" aria-hidden="true" />{review.helpfulCount ?? 0}</span>
        : canVote
        ? <button type="button" aria-pressed={hasVoted} disabled={isVotePending} onClick={onToggleHelpful} className={`inline-flex min-h-8 items-center gap-1.5 rounded-[var(--radius-control)] border px-2.5 text-[10px] font-bold transition disabled:cursor-wait disabled:opacity-60 ${hasVoted ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary'}`}><Heart className={`size-3.5 ${hasVoted ? 'fill-current' : ''}`} aria-hidden="true" />{hasVoted ? t('profile.community.helpfulMarked') : t('profile.community.helpful')}<span className="tabular-nums">{review.helpfulCount ?? 0}</span></button>
        : needsEmailVerification
            ? <button type="button" disabled title={t('profile.community.verifyToVote')} className="inline-flex min-h-8 items-center gap-1.5 rounded-[var(--radius-control)] border border-border px-2.5 text-[10px] font-bold text-muted-foreground opacity-65"><Heart className="size-3.5" aria-hidden="true" />{t('profile.community.helpful')}<span>{review.helpfulCount ?? 0}</span></button>
            : !isSignedIn ? <Link to={ROUTES.login} title={t('profile.community.signInToVote')} className="inline-flex min-h-8 items-center gap-1.5 rounded-[var(--radius-control)] border border-border px-2.5 text-[10px] font-bold text-muted-foreground hover:border-primary/40 hover:text-primary"><Heart className="size-3.5" aria-hidden="true" />{t('profile.community.helpful')}<span>{review.helpfulCount ?? 0}</span></Link>
                : <span className="inline-flex min-h-8 items-center gap-1.5 px-1 text-[10px] font-bold text-muted-foreground"><Heart className="size-3.5" aria-hidden="true" />{review.helpfulCount ?? 0}</span>
    return <article className="flex h-full min-h-36 flex-col rounded-[var(--radius-card)] border border-border bg-background p-3.5"><div className="flex items-start justify-between gap-2"><div className="flex min-w-0 items-start gap-2"><span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-muted-foreground">{review.avatarUrl ? <AutoCareImage src={review.avatarUrl} alt="" className="size-full object-cover" /> : <UserRound className="size-4" aria-hidden="true" />}</span><div className="min-w-0"><p className="truncate text-[11px] font-black leading-4 text-foreground">{profileId ? <Link to={`/community/clients/${encodeURIComponent(profileId)}`} className="outline-none hover:text-primary focus-visible:underline">{author}</Link> : author}</p>{review.communityProfile?.badgeCodes.length ? <div className="mt-1"><AutoCareCommunityBadgeList badgeCodes={review.communityProfile.badgeCodes} profileId={profileId} compact /></div> : <p className="text-[10px] font-semibold text-muted-foreground">{t('profile.community.visitVerified')}</p>}</div></div><span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-black text-rating-foreground"><Star className="size-3 fill-rating-fill" aria-hidden="true" />{review.rating.toFixed(1)}</span></div><p className="mt-3 text-[11px] font-medium leading-4 text-muted-foreground">{review.text}</p>{review.photos?.length ? <div className="mt-3 flex gap-2">{review.photos.slice(0, 2).map((photo) => <AutoCareImage key={photo} src={photo} alt={t('autocare.providerReviewPhoto')} className="size-12 rounded-[var(--radius-control)] object-cover" />)}</div> : null}<div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3"><p className="text-[10px] font-medium text-muted-foreground">{review.date}</p>{helpfulControl}</div></article>
}

function ReviewSelect({ options, value, onChange }: { options: readonly SelectOption[]; value: string; onChange: (value: string) => void }) {
    const [isOpen, setIsOpen] = useState(false)
    const selectedOption = options.find((option) => option.value === value) ?? options[0]

    if (!selectedOption) return null

    return <div className="relative"><button type="button" aria-haspopup="listbox" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)} className="inline-flex h-8 min-w-25 items-center justify-between gap-3 rounded-[var(--radius-control)] border border-border bg-background py-0 pl-3 pr-2 text-[10px] font-semibold text-foreground outline-none transition hover:border-primary focus:border-primary"><span>{selectedOption.label}</span><ChevronDown className={`size-3.5 shrink-0 transition ${isOpen ? 'rotate-180' : ''}`} /></button>{isOpen ? <div role="listbox" className="absolute right-0 z-10 mt-1 min-w-full max-h-60 overflow-y-auto rounded-[var(--radius-control)] border border-border bg-card py-1 shadow-lg">{options.map((option) => <button key={option.value} role="option" type="button" aria-selected={option.value === selectedOption.value} onClick={() => { onChange(option.value); setIsOpen(false) }} className="block w-full whitespace-nowrap px-3 py-2 text-left text-[10px] font-semibold text-foreground hover:bg-secondary">{option.label}</button>)}</div> : null}</div>
}
