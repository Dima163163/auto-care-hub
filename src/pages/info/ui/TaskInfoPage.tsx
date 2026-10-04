import { ArrowRight, BookOpen, Handshake } from 'lucide-react'
import { Link } from 'react-router'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

export function TaskInfoPage({ kind }: { kind: 'blog' | 'partners' }) {
    const { t } = useTranslation()
    const Icon = kind === 'blog' ? BookOpen : Handshake
    const actions = kind === 'blog' ? [
        { title: t('info.help.topicFindSpaceTitle'), text: t('info.help.topicFindSpaceDescription'), to: `${ROUTES.help}?audience=guest&category=search` },
        { title: t('info.help.topicCancellationTitle'), text: t('info.help.topicCancellationDescription'), to: `${ROUTES.help}?audience=client&category=pricing` },
        { title: t('info.help.topicManageTitle'), text: t('info.help.topicManageDescription'), to: `${ROUTES.help}?audience=client&category=messages` },
    ] : [
        { title: t('autocare.partnerJoinProcessTitle'), text: t('autocare.partnerJoinProcessText'), to: ROUTES.owners },
        { title: t('auth.createAccount'), text: t('autocare.partnerAccountText'), to: ROUTES.register },
        { title: t('autocare.ownerProvidersTitle'), text: t('autocare.partnerWorkspaceText'), to: ROUTES.ownerAutoCareProviders },
    ]
    return <main className="bg-background px-[var(--layout-gutter)] py-8 text-foreground sm:py-10"><section className="mx-auto max-w-6xl">
        <p className="flex items-center gap-2 text-sm font-medium text-primary"><Icon className="size-5" />{t(kind === 'blog' ? 'info.blog.eyebrow' : 'info.partners.eyebrow')}</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">{t(kind === 'blog' ? 'info.blog.title' : 'info.partners.title')}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{t(kind === 'blog' ? 'autocare.blogPublicationStatus' : 'autocare.partnerCurrentPath')}</p>
        <div className="mt-7 grid gap-4 md:grid-cols-3">{actions.map((action) => <article key={action.to} className="flex flex-col rounded-lg border bg-card p-5"><h2 className="text-lg font-semibold">{action.title}</h2><p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{action.text}</p><Link to={action.to} className="mt-5 inline-flex min-h-11 items-center justify-between gap-2 rounded-md border px-3 text-sm font-medium text-primary">{t('autocare.helpNextStep')}<ArrowRight className="size-4" /></Link></article>)}</div>
    </section></main>
}
