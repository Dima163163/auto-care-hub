import { Bell, Check, Clock3, Search, Star } from 'lucide-react'

import { useTranslation } from '@/shared/lib/useTranslation'

const reviews = [
    { avatar: '/images/autocare/avatars/alexey.webp', name: 'Алексей С.', car: 'BMW X5', text: 'Отличный сервис! Нашёл ближайший автосервис с хорошим рейтингом и ценой за пару кликов. Записался онлайн, всё сделали быстро и качественно.', time: '2 дня назад' },
    { avatar: '/images/autocare/avatars/maria.webp', name: 'Мария К.', car: 'Toyota RAV4', text: 'Очень удобно сравнивать цены и время записи. Сэкономила время и деньги. Теперь только через AutoCare Hub ищу автосервисы.', time: '1 неделю назад' },
    { avatar: '/images/autocare/avatars/igor.webp', name: 'Игорь П.', car: 'Skoda Octavia', text: 'Пользуюсь сервисом постоянно. Всегда можно найти проверенный сервис рядом с работой или домом. Рекомендую!', time: '2 недели назад' },
] as const

export function HomeReviewsSection() {
    return (
        <section className="mx-auto grid max-w-[var(--layout-public-max)] gap-4 px-[var(--layout-gutter)] pb-10 lg:grid-cols-[1.55fr_0.95fr]">
            <ReviewsCard />
            <MobileAppCard />
        </section>
    )
}

function ReviewsCard() {
    const { t } = useTranslation()
    return (
        <section className="rounded-[10px] border border-border bg-card p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-black">{t('autocare.reviewsTitle')}</h2><span className="text-xs font-semibold text-primary">{t('autocare.allReviews')}</span></div><div className="mt-5 grid gap-3 md:grid-cols-3">{reviews.map((review) => <article key={review.name} className="rounded-[8px] border border-border p-4"><div className="flex items-center gap-3"><img src={review.avatar} alt="" className="size-11 rounded-full object-cover" /><div><h3 className="text-sm font-black">{review.name}</h3><p className="text-xs text-muted-foreground">{review.car}</p></div></div><div className="mt-3 flex">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className="size-3.5 fill-rating-fill text-rating-fill" />)}</div><p className="mt-3 text-[0.7rem] leading-[1.55] text-muted-foreground">{review.text}</p><p className="mt-4 text-[0.68rem] text-muted-foreground/75">{review.time}</p></article>)}</div></section>
    )
}

function MobileAppCard() {
    const { t } = useTranslation()
    const items = [{ icon: Search, key: 'autocare.mobileAppSearch' }, { icon: Check, key: 'autocare.mobileAppBooking' }, { icon: Clock3, key: 'autocare.mobileAppHistory' }, { icon: Bell, key: 'autocare.mobileAppAlerts' }] as const
    return (
        <section className="relative min-h-[326px] overflow-hidden rounded-[10px] border border-border bg-card p-5">
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden" aria-hidden="true">
                <span className="w-[125%] -rotate-[18deg] border-y border-primary/30 bg-primary/75 py-3 text-center text-sm font-black uppercase tracking-[0.28em] text-primary-foreground shadow-lg shadow-primary/20 backdrop-blur-[2px] sm:text-base">
                    {t('autocare.mobileAppComingSoon')}
                </span>
            </div>
            <div className="relative z-10 max-w-[15rem]"><h2 className="text-lg font-black">{t('autocare.mobileAppTitle')}</h2><p className="mt-1 text-sm text-muted-foreground">{t('autocare.mobileAppDescription')}</p><ul className="mt-6 grid gap-4 text-sm text-muted-foreground">{items.map((item) => <li key={item.key} className="flex items-center gap-3"><item.icon className="size-4" />{t(item.key)}</li>)}</ul><div className="mt-7 flex gap-2"><StoreBadge store="apple" label="App Store" /><StoreBadge store="google" label="Google Play" /></div></div><img src="/images/autocare/mobile/app-phones.webp" alt="" aria-hidden="true" className="absolute -bottom-[9%] -right-[12%] block h-[112%] w-[72%] object-cover object-[66%_center] dark:hidden" /><img src="/images/autocare/mobile/app-phones-dark.webp" alt="" aria-hidden="true" className="absolute -bottom-[9%] -right-[12%] hidden h-[112%] w-[72%] object-cover object-[66%_center] dark:block" /></section>
    )
}

function StoreBadge({ store, label }: { store: 'apple' | 'google'; label: string }) {
    return <span className="inline-flex h-9 items-center gap-2 rounded-[4px] bg-foreground px-3 text-[0.66rem] font-bold text-background">{store === 'apple' ? <AppleIcon /> : <GooglePlayIcon />}{label}</span>
}

function AppleIcon() {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-current"><path d="M16.7 12.7c0-2.2 1.8-3.3 1.9-3.4a4.2 4.2 0 0 0-3.3-1.8c-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-3-.8a4.5 4.5 0 0 0-3.8 2.3c-1.6 2.8-.4 6.9 1.2 9.2.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3.1-.7 1.4 0 1.9.7 3.1.7 1.3 0 2.1-1.1 2.8-2.2.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.8-1.1-2.8-3.7ZM14.4 6c.6-.8 1.1-1.9 1-3-.9 0-2 .6-2.7 1.3-.6.7-1.1 1.8-1 2.9 1 .1 2-.5 2.7-1.2Z" /></svg>
}

function GooglePlayIcon() {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4"><path className="fill-store-google-green" d="M3.4 2.8a2 2 0 0 0-.4 1.3v15.8c0 .5.2 1 .5 1.4l9-9.3-9.1-9.2Z" /><path className="fill-store-google-yellow" d="m15.4 9-2.9 3 2.9 3 3.9-2.2c1-.5 1-1.2 0-1.7L15.4 9Z" /><path className="fill-store-google-blue" d="m3.4 2.8 9.1 9.2 2.9-3-9.8-5.6a3.7 3.7 0 0 0-2.2-.6Z" /><path className="fill-store-google-red" d="m3.5 21.3 9-9.3 2.9 3-9.7 5.5c-.8.5-1.6.7-2.2.8Z" /></svg>
}
