import { CircleHelp, ListChecks, MapPinned, MessageCircle } from 'lucide-react'
import type { ReactNode } from 'react'

import { useTranslation } from '@/shared/lib/useTranslation'

export function ProviderSectionNavigation() {
    const { t } = useTranslation()

    return (
        <nav aria-label={t('autocare.providerProfile')} className="border-b border-border bg-card shadow-sm">
            <div className="mx-auto flex max-w-[var(--layout-public-wide-max)] gap-1 overflow-x-auto px-[var(--layout-public-gutter)] py-2">
                <ProviderSectionLink href="#services" icon={<ListChecks className="size-4" />}>{t('autocare.providerServices')}</ProviderSectionLink>
                <ProviderSectionLink href="#about" icon={<CircleHelp className="size-4" />}>{t('autocare.providerAbout')}</ProviderSectionLink>
                <ProviderSectionLink href="#location" icon={<MapPinned className="size-4" />}>{t('autocare.providerLocation')}</ProviderSectionLink>
                <ProviderSectionLink href="#reviews" icon={<MessageCircle className="size-4" />}>{t('autocare.providerReviews')}</ProviderSectionLink>
            </div>
        </nav>
    )
}

function ProviderSectionLink({ children, href, icon }: { children: string; href: string; icon: ReactNode }) {
    return <a href={href} className="inline-flex shrink-0 items-center gap-2 rounded-[var(--radius-control)] px-3 py-2 text-xs font-black text-muted-foreground transition hover:bg-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40">{icon}{children}</a>
}
