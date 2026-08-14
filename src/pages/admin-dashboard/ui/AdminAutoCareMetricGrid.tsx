import { Building2, ShieldAlert, Star, Users } from 'lucide-react'

type AdminAutoCareMetricGridProps = { locale: string; providers: { total: number; active: number; verified: number; draft: number }; users: { total: number; owners: number } }
const copy = { en: { services: 'Service profiles', active: 'active', review: 'Review queue', profiles: 'profiles', trust: 'Verified services', signals: 'trust signals', users: 'Platform users', owners: 'service owners' }, ru: { services: 'Профили сервисов', active: 'активно', review: 'Очередь проверки', profiles: 'профилей', trust: 'Проверенные сервисы', signals: 'сигналы доверия', users: 'Пользователи платформы', owners: 'владельцев сервисов' } }

export function AdminAutoCareMetricGrid({ locale, providers, users }: AdminAutoCareMetricGridProps) {
    const text = locale === 'ru' ? copy.ru : copy.en
    const cards = [{ icon: Building2, label: text.services, value: providers.total, note: `${providers.active} ${text.active}` }, { icon: ShieldAlert, label: text.review, value: providers.draft, note: `${text.profiles} ${text.review.toLocaleLowerCase()}` }, { icon: Star, label: text.trust, value: providers.verified, note: text.signals }, { icon: Users, label: text.users, value: users.total, note: `${users.owners} ${text.owners}` }]
    return <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ icon: Icon, label, value, note }) => <article key={label} className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><Icon className="size-5 text-primary" /><p className="mt-5 text-2xl font-black tabular-nums text-foreground">{value}</p><p className="mt-1 text-sm font-bold text-foreground">{label}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></article>)}</section>
}
