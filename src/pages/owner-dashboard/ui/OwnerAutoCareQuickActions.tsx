import { BarChart3, CarFront, ClipboardList, MessageSquareText } from 'lucide-react'
import { Link } from 'react-router'

import { ROUTES } from '@/shared/constants/routes'

type OwnerAutoCareQuickActionsProps = { locale: string }
const copy = { en: { title: 'Business operations', subtitle: 'Keep the service profile accurate and answer customers without losing context.', providers: 'Service profiles', requests: 'Requests and messages', services: 'Services and prices', analytics: 'Quality and analytics' }, ru: { title: 'Операции бизнеса', subtitle: 'Поддерживайте профиль сервиса актуальным и отвечайте клиентам без потери контекста.', providers: 'Профили сервисов', requests: 'Заявки и сообщения', services: 'Услуги и цены', analytics: 'Качество и аналитика' } }

export function OwnerAutoCareQuickActions({ locale }: OwnerAutoCareQuickActionsProps) {
    const text = locale === 'ru' ? copy.ru : copy.en
    const actions = [{ icon: CarFront, label: text.providers, to: ROUTES.ownerAutoCareProviders }, { icon: MessageSquareText, label: text.requests, to: ROUTES.ownerAutoCareRequests }, { icon: ClipboardList, label: text.services, to: ROUTES.ownerServices }, { icon: BarChart3, label: text.analytics, to: ROUTES.ownerDashboard }]
    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><h2 className="text-lg font-black text-foreground">{text.title}</h2><p className="mt-1 text-sm text-muted-foreground">{text.subtitle}</p><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{actions.map(({ icon: Icon, label, to }) => <Link key={label} to={to} className="flex min-h-24 flex-col justify-between rounded-[var(--radius-card)] border border-border bg-background p-4 transition hover:border-primary/50 hover:bg-primary/5"><Icon className="size-5 text-primary" /><span className="mt-5 text-sm font-black text-foreground">{label}</span></Link>)}</div></section>
}
