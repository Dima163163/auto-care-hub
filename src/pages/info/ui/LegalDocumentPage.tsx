import { FileText, Info, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router'

import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import type { TranslationKey } from '@/shared/lib/i18n'

type LegalDocument = 'agreement' | 'rules' | 'privacy'

type LegalSection = {
    id: string
    titleKey: TranslationKey
    bodyKeys: [TranslationKey, TranslationKey]
    bulletKeys: [TranslationKey, TranslationKey]
}

const sectionFactory = (document: LegalDocument, index: 1 | 2 | 3 | 4 | 5): LegalSection => ({
    id: `${document}-${index}`,
    titleKey: `info.legal.${document}.section${index}Title`,
    bodyKeys: [
        `info.legal.${document}.section${index}Body1`,
        `info.legal.${document}.section${index}Body2`,
    ],
    bulletKeys: [
        `info.legal.${document}.section${index}Bullet1`,
        `info.legal.${document}.section${index}Bullet2`,
    ],
})

const documentConfig: Record<LegalDocument, { icon: typeof FileText; sections: LegalSection[] }> = {
    agreement: { icon: FileText, sections: [1, 2, 3, 4, 5].map((index) => sectionFactory('agreement', index as 1 | 2 | 3 | 4 | 5)) },
    rules: { icon: ShieldCheck, sections: [1, 2, 3, 4, 5].map((index) => sectionFactory('rules', index as 1 | 2 | 3 | 4 | 5)) },
    privacy: { icon: LockKeyhole, sections: [1, 2, 3, 4, 5].map((index) => sectionFactory('privacy', index as 1 | 2 | 3 | 4 | 5)) },
}

export function LegalDocumentPage({ document }: { document: LegalDocument }) {
    const { t } = useTranslation()
    const config = documentConfig[document]
    const Icon = config.icon

    return (
        <main className="relative isolate overflow-hidden bg-background text-foreground">
            <section className="relative border-b bg-card text-foreground">
                <div className="relative mx-auto max-w-[1100px] px-[var(--layout-gutter)] py-7 sm:py-9">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">{t(`info.legal.${document}.eyebrow`)}</p>
                    <h1 className="mt-2 max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{t(`info.legal.${document}.title`)}</h1>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{t(`info.legal.${document}.description`)}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                        <span>{t('info.legal.common.lastUpdated')}</span>
                        <span className="inline-flex items-center gap-2"><Icon className="size-4 text-primary" />{t('info.legal.common.audience')}</span>
                    </div>
                </div>
            </section>

            <div className="mx-auto grid max-w-[1100px] gap-6 px-[var(--layout-gutter)] py-7 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-9">
                <aside className="h-fit lg:sticky lg:top-24">
                    <nav aria-label={t('info.legal.common.tocTitle')} className="rounded-[var(--radius-panel)] border border-border bg-card p-4 shadow-sm">
                        <p className="text-sm font-black">{t('info.legal.common.tocTitle')}</p>
                        <div className="mt-3 grid gap-1">
                            {config.sections.map((section, index) => (
                                <a key={section.id} href={`#${section.id}`} className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary">
                                    {index + 1}. {t(section.titleKey)}
                                </a>
                            ))}
                        </div>
                    </nav>
                </aside>

                <div className="min-w-0 max-w-[760px]">
                    <div className="flex gap-3 rounded-[var(--radius-panel)] border border-primary/20 bg-primary/5 p-4 text-sm leading-6">
                        <Info className="mt-0.5 size-5 shrink-0 text-primary" />
                        <div><p className="font-black">{t('info.legal.common.draftTitle')}</p><p className="mt-1 text-muted-foreground">{t('info.legal.common.draftText')}</p></div>
                    </div>

                    <div className="mt-6 grid gap-5">
                        {config.sections.map((section, index) => (
                            <article id={section.id} key={section.id} className="scroll-mt-24 rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm sm:p-7">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">{t('info.legal.common.sectionLabel')} {index + 1}</p>
                                <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{t(section.titleKey)}</h2>
                                <div className="mt-4 grid gap-4 text-base leading-7 text-foreground">
                                    {section.bodyKeys.map((key) => <p key={key}>{t(key)}</p>)}
                                </div>
                                <ul className="mt-4 grid gap-3 text-base leading-7">
                                    {section.bulletKeys.map((key) => <li key={key} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" /> <span>{t(key)}</span></li>)}
                                </ul>
                            </article>
                        ))}
                    </div>

                    <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-6 text-sm font-bold">
                        <span className="text-muted-foreground">{t('info.legal.common.readAlso')}</span>
                        <Link to={ROUTES.agreement} className="text-primary hover:underline">{t('info.legal.agreement.shortTitle')}</Link>
                        <Link to={ROUTES.rules} className="text-primary hover:underline">{t('info.legal.rules.shortTitle')}</Link>
                        <Link to={ROUTES.privacy} className="text-primary hover:underline">{t('info.legal.privacy.shortTitle')}</Link>
                        <Link to={ROUTES.help} className="text-primary hover:underline">{t('landing.footerHelpCenter')}</Link>
                    </div>
                </div>
            </div>
        </main>
    )
}
