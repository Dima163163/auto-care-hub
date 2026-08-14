import { ArrowRight, Plus, Sparkles } from 'lucide-react'
import { Link } from 'react-router'

import { ROUTES } from '@/shared/constants/routes'

type OwnerAutoCareDashboardHeroProps = { locale: string; ownerName: string | undefined }

const copy = {
    en: { eyebrow: 'Service owner workspace', title: 'Run every service location from one place.', description: 'Manage profiles, customer requests, messages and quality signals without mixing them with client tools.', requests: 'Open requests', profile: 'Add service' },
    ru: { eyebrow: 'Рабочая область владельца', title: 'Управляйте всеми точками сервиса в одном месте.', description: 'Профили, заявки клиентов, переписка и показатели качества — без смешивания с клиентским кабинетом.', requests: 'Открыть заявки', profile: 'Добавить сервис' },
}

export function OwnerAutoCareDashboardHero({ locale, ownerName }: OwnerAutoCareDashboardHeroProps) {
    const text = locale === 'ru' ? copy.ru : copy.en
    const title = ownerName ? `${ownerName}, ${text.title[0].toLocaleLowerCase()}${text.title.slice(1)}` : text.title
    return <section className="overflow-hidden rounded-[var(--radius-panel)] border border-primary/30 bg-[linear-gradient(124deg,hsl(var(--primary)/0.18),hsl(var(--card)),hsl(var(--card)))] p-6 shadow-sm md:p-8"><div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div className="max-w-2xl"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-primary"><Sparkles className="size-4" />{text.eyebrow}</p><h1 className="mt-3 text-3xl font-black tracking-tight text-foreground md:text-4xl">{title}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground md:text-base">{text.description}</p></div><div className="flex flex-wrap gap-3"><Link to={ROUTES.ownerAutoCareRequests} className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-control)] border border-border bg-card px-4 text-sm font-black text-foreground transition hover:border-primary hover:text-primary"><ArrowRight className="size-4" />{text.requests}</Link><Link to={ROUTES.ownerAutoCareProviders} className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"><Plus className="size-4" />{text.profile}</Link></div></div></section>
}
