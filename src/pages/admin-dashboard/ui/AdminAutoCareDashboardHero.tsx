import { ShieldCheck, UsersRound } from 'lucide-react'

type AdminAutoCareDashboardHeroProps = { locale: string; pendingCount: number }
const copy = { en: { eyebrow: 'Platform moderation', title: 'Keep the marketplace trustworthy.', description: 'Review service profiles, quality signals and the people behind every listing.', pending: 'profiles need review' }, ru: { eyebrow: 'Модерация платформы', title: 'Поддерживайте доверие к маркетплейсу.', description: 'Проверяйте профили сервисов, сигналы качества и данные владельцев каждой карточки.', pending: 'профилей ждут проверки' } }

export function AdminAutoCareDashboardHero({ locale, pendingCount }: AdminAutoCareDashboardHeroProps) {
    const text = locale === 'ru' ? copy.ru : copy.en
    return <section className="overflow-hidden rounded-[var(--radius-panel)] border border-primary/30 bg-[linear-gradient(124deg,hsl(var(--primary)/0.17),hsl(var(--card)),hsl(var(--card)))] p-6 shadow-sm md:p-8"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div className="max-w-2xl"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-primary"><ShieldCheck className="size-4" />{text.eyebrow}</p><h1 className="mt-3 text-3xl font-black tracking-tight text-foreground md:text-4xl">{text.title}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">{text.description}</p></div><span className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-card px-4 py-3 text-sm font-black text-foreground shadow-sm"><UsersRound className="size-4 text-primary" /><b>{pendingCount}</b> {text.pending}</span></div></section>
}
