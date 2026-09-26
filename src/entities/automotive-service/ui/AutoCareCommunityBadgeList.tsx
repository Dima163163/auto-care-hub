import { BadgeCheck, Heart, Sparkles, Wrench } from 'lucide-react'
import { Link } from 'react-router'

import { useTranslation } from '@/shared/lib/useTranslation'

export type AutoCareCommunityBadgeCode = 'verified_client' | 'regular_client' | 'helpful_reviewer' | 'autocare_expert'

const badgeIcons = {
    verified_client: BadgeCheck,
    regular_client: Wrench,
    helpful_reviewer: Heart,
    autocare_expert: Sparkles,
} satisfies Record<AutoCareCommunityBadgeCode, typeof BadgeCheck>

export function AutoCareCommunityBadgeList({
    badgeCodes,
    profileId,
    compact = false,
}: {
    badgeCodes: readonly AutoCareCommunityBadgeCode[]
    profileId?: string | null
    compact?: boolean
}) {
    const { t } = useTranslation()
    if (badgeCodes.length === 0) return null

    return <span className="flex flex-wrap gap-1.5">
        {badgeCodes.map((code) => {
            const Icon = badgeIcons[code]
            const label = t(`profile.community.badges.${code}.title`)
            const badge = <span title={label} className={`inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/8 px-2 py-1 font-bold text-primary ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
                <Icon className="size-3 shrink-0" aria-hidden="true" />
                {!compact && <span>{label}</span>}
                {compact && <span className="sr-only">{label}</span>}
            </span>
            return profileId
                ? <Link key={code} to={`/community/clients/${encodeURIComponent(profileId)}`} aria-label={label} className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">{badge}</Link>
                : <span key={code}>{badge}</span>
        })}
    </span>
}
