import { Mail, Phone, Send } from 'lucide-react'
import { Link } from 'react-router'

import { footerColumns } from '@/shared/config/footer-navigation'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { BrandLogo } from '@/shared/ui/brand-logo'
import { ThemeSwitcher } from '@/widgets/theme-switcher'

type FooterProps = { desktopOnly?: boolean; variant?: 'public' | 'operational' }

export function Footer({ desktopOnly = false, variant = 'public' }: FooterProps) {
    const { t } = useTranslation()

    if (variant === 'operational') return <footer className="mt-auto flex items-center justify-between gap-4 border-t border-border bg-card px-6 py-4 text-xs text-muted-foreground"><p>{t('workspace.systemStatus')}</p><ThemeSwitcher /></footer>

    return (
        <footer className={`${desktopOnly ? 'hidden xl:block' : ''} relative z-10 mt-auto shrink-0 border-t border-primary-foreground/10 bg-hero-overlay py-9 text-primary-foreground`}>
            <div className="mx-auto max-w-[var(--layout-public-max)] px-[var(--layout-gutter)]">
                <div className="grid gap-8 md:grid-cols-3 lg:grid-cols-[1.35fr_repeat(4,1fr)]">
                    <div><Link to={ROUTES.home} className="inline-flex"><BrandLogo size="sm" /></Link><p className="mt-5 max-w-[17rem] text-sm leading-6 text-primary-foreground/65">{t('landing.footerDescription')}</p><div className="mt-5 flex gap-4 text-primary-foreground/75"><span className="font-black">VK</span><Send className="size-5" /><span className="font-black">▶</span><span className="font-black">◎</span></div></div>
                    {footerColumns.map(({ titleKey, items }) => <div key={titleKey}><p className="mb-4 text-sm font-black">{t(titleKey)}</p><ul className="grid gap-3">{items.map(({ labelKey, to }) => <li key={labelKey}><Link to={to} className="text-sm text-primary-foreground/65 hover:text-primary">{t(labelKey)}</Link></li>)}</ul></div>)}
                </div>
                <div className="mt-8 flex flex-col gap-4 border-t border-primary-foreground/10 pt-6 text-xs text-primary-foreground/60 sm:flex-row sm:items-center sm:justify-between"><p>{t('landing.footerRights')}</p><div className="flex flex-wrap items-center gap-6"><span className="flex items-center gap-2"><Phone className="size-4" />8 (800) 550-35-35</span><span className="flex items-center gap-2"><Mail className="size-4" />support@autocarehub.ru</span><ThemeSwitcher /></div></div>
            </div>
        </footer>
    )
}
