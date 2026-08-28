import type { ReactNode } from 'react'

import { Battery, CarFront, ChevronDown, CircleGauge, MapPin, Menu, Moon, Search, ShieldCheck, SlidersHorizontal, Sun, Truck, Wrench, Zap } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { BrandLogo } from '@/shared/ui/brand-logo'
import { FloatingSelect } from '@/shared/ui/floating-field'

type BootShellProps = {
    home?: boolean
    services?: boolean
    workspaceRole?: BootWorkspaceRole
}

export type BootWorkspaceRole = 'client' | 'owner' | 'admin' | 'super_admin'

export function BootShell({ home = false, services = false, workspaceRole }: BootShellProps) {
    if (workspaceRole) {
        return <WorkspaceBootShell role={workspaceRole} />
    }

    return (
        <div className="autocare-app-surface flex min-h-screen flex-col overflow-x-clip bg-background text-foreground">
            <BootHeader />
            <main className="min-h-0 flex-1">
                {home ? <HomeBootContent /> : services ? <ServicesBootContent /> : <GenericBootContent />}
            </main>
            <BootFooter />
        </div>
    )
}

function WorkspaceBootShell({ role }: { role: BootWorkspaceRole }) {
    return (
        <div className="autocare-app-surface flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground">
            <WorkspaceBootHeader role={role} />
            <div className="flex min-h-0 flex-1 overflow-hidden">
                <WorkspaceBootSidebar role={role} />
                <main data-testid="workspace-boot-content" className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-background">
                    <WorkspaceBootPage role={role} />
                </main>
            </div>
        </div>
    )
}

function WorkspaceBootHeader({ role }: { role: BootWorkspaceRole }) {
    return (
        <header className="flex h-[72px] shrink-0 items-center gap-4 border-b border-primary-foreground/10 bg-hero-overlay px-[var(--layout-gutter)] text-primary-foreground" aria-label="Навигация AutoCare Hub">
            <div className="mx-auto flex w-full max-w-[var(--layout-operational-max)] items-center gap-5">
                <BrandLogo size="sm" />
                <nav className="hidden items-center gap-5 text-xs font-semibold text-primary-foreground/85 lg:flex">
                    <a href="/services" className="cursor-pointer transition-colors hover:text-primary">Автоуслуги</a>
                    <a href="/reviews" className="cursor-pointer transition-colors hover:text-primary">Отзывы</a>
                    <a href="/help" className="cursor-pointer transition-colors hover:text-primary">Помощь и информация</a>
                </nav>
                <div className="ml-auto flex items-center gap-2">
                    <span className="hidden h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-primary-foreground/20 bg-primary-foreground/5 px-3 text-xs font-semibold sm:inline-flex"><MapPin className="size-3.5" />Москва</span>
                    <span className="hidden h-9 items-center rounded-[var(--radius-control)] border border-primary-foreground/20 bg-primary-foreground/5 px-3 text-xs font-semibold sm:inline-flex">RU</span>
                    <span className="flex h-9 items-center rounded-full border border-primary-foreground/20 bg-primary-foreground/5 px-1 text-primary-foreground/85"><Sun className="size-4" /><Moon className="size-4" /></span>
                    <span className="inline-flex size-9 items-center justify-center rounded-[var(--radius-control)] border border-primary-foreground/20 bg-primary-foreground/5 lg:hidden"><Menu className="size-4" /></span>
                    <Skeleton aria-hidden="true" className="size-9 rounded-full bg-primary-foreground/15" />
                </div>
            </div>
            <span className="sr-only">Загрузка рабочего пространства: {role}</span>
        </header>
    )
}

const workspaceBootGroups: Record<BootWorkspaceRole, Array<{ title: string; items: Array<{ label: string; href: string }> }>> = {
    client: [
        { title: 'ОБЗОР', items: [{ label: 'Профиль', href: '/profile' }] },
        { title: 'УПРАВЛЕНИЕ', items: [{ label: 'Автоуслуги', href: '/services' }, { label: 'Мои автомобили', href: '/profile/vehicles' }, { label: 'Мои записи', href: '/profile/bookings' }, { label: 'Отзывы', href: '/profile/reviews' }] },
        { title: 'ПОДДЕРЖКА', items: [{ label: 'Центр помощи', href: '/help' }] },
    ],
    owner: [
        { title: 'ОБЗОР', items: [{ label: 'Панель владельца', href: '/owner/dashboard' }] },
        { title: 'УПРАВЛЕНИЕ', items: [{ label: 'Автосервисы', href: '/owner/autocare-providers' }, { label: 'Заявки клиентов', href: '/owner/autocare-requests' }, { label: 'Отзывы', href: '/owner/reviews' }, { label: 'Клиенты', href: '/owner/clients' }, { label: 'Услуги', href: '/owner/services' }] },
        { title: 'НАСТРОЙКА', items: [{ label: 'Профиль', href: '/profile' }, { label: 'Уведомления', href: '/notifications' }] },
        { title: 'ПОДДЕРЖКА', items: [{ label: 'Центр помощи', href: '/help' }] },
    ],
    admin: [
        { title: 'ОБЗОР', items: [{ label: 'Панель управления', href: '/admin/dashboard' }] },
        { title: 'УПРАВЛЕНИЕ', items: [{ label: 'Пользователи', href: '/admin/users' }, { label: 'Владельцы', href: '/admin/owners' }, { label: 'Отзывы', href: '/admin/reviews' }] },
        { title: 'ПОДДЕРЖКА', items: [{ label: 'Центр помощи', href: '/help' }] },
    ],
    super_admin: [
        { title: 'ОБЗОР', items: [{ label: 'Супер-админ', href: '/super-admin/dashboard' }] },
        { title: 'УПРАВЛЕНИЕ', items: [{ label: 'Пользователи', href: '/admin/users' }, { label: 'Владельцы', href: '/admin/owners' }, { label: 'Отзывы', href: '/admin/reviews' }] },
        { title: 'ПОДДЕРЖКА', items: [{ label: 'Центр помощи', href: '/help' }] },
    ],
}

function WorkspaceBootSidebar({ role }: { role: BootWorkspaceRole }) {
    return (
        <aside data-testid="workspace-boot-sidebar" className="hidden w-[232px] shrink-0 border-r border-border bg-background md:block" aria-label="Навигация рабочего пространства">
            <div className="flex h-full flex-col gap-7 px-3 py-5">
                {workspaceBootGroups[role].map((group) => (
                    <div key={group.title} className="space-y-1">
                        <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">{group.title}</p>
                        {group.items.map((item) => (
                            <a key={item.href} href={item.href} className="flex h-10 cursor-pointer items-center gap-3 rounded-md px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                <span className="size-4 shrink-0 rounded-sm border border-muted-foreground/50" aria-hidden="true" />
                                <span className="truncate">{item.label}</span>
                            </a>
                        ))}
                    </div>
                ))}
                <a href="/help" className="mt-auto flex h-10 cursor-pointer items-center px-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">Свернуть меню</a>
            </div>
        </aside>
    )
}

function WorkspaceBootPage({ role }: { role: BootWorkspaceRole }) {
    const pageLabel = role === 'owner' ? 'Загрузка кабинета владельца' : role === 'client' ? 'Загрузка кабинета клиента' : 'Загрузка панели управления'

    return (
        <div className="mx-auto w-full max-w-[var(--layout-operational-max)] px-[var(--layout-gutter)] py-6 sm:py-8" role="status" aria-busy="true" aria-label={pageLabel}>
            <div className="space-y-3">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-10 w-72 max-w-full" />
                <Skeleton className="h-4 w-full max-w-2xl" />
            </div>

            <div className="mt-6 space-y-5">
                <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm" aria-hidden="true">
                    <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
                        <div className="space-y-2"><Skeleton className="h-5 w-44" /><Skeleton className="h-3 w-64 max-w-full" /></div>
                        <Skeleton className="h-9 w-28 rounded-[var(--radius-control)]" />
                    </div>
                    <div className="autocare-map-skeleton mt-4 min-h-[260px] rounded-[var(--radius-card)] border border-border" />
                </section>

                <section data-testid="workspace-boot-form" className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm" aria-hidden="true">
                    <div className="space-y-2"><Skeleton className="h-5 w-52" /><Skeleton className="h-3 w-full" /></div>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        {Array.from({ length: 6 }, (_, index) => <WorkspaceFieldSkeleton key={index} />)}
                    </div>
                    <Skeleton className="mt-4 h-20 w-full rounded-[var(--radius-control)]" />
                    <div className="mt-4 grid gap-3 sm:grid-cols-2"><Skeleton className="h-11 w-full rounded-[var(--radius-control)]" /><Skeleton className="h-11 w-full rounded-[var(--radius-control)]" /></div>
                    <div className="mt-5 grid grid-cols-2 gap-3"><Skeleton className="h-10 w-full rounded-[var(--radius-control)]" /><Skeleton className="h-10 w-full rounded-[var(--radius-control)]" /><Skeleton className="h-10 w-full rounded-[var(--radius-control)]" /><Skeleton className="h-10 w-full rounded-[var(--radius-control)]" /></div>
                </section>
            </div>

            <section className="mt-6 rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm" aria-hidden="true">
                <div className="flex items-center justify-between gap-4"><Skeleton className="h-5 w-52" /><Skeleton className="h-9 w-36 rounded-[var(--radius-control)]" /></div>
                <div className="mt-5 grid gap-4 md:grid-cols-2"><Skeleton className="h-16 w-full rounded-[var(--radius-control)]" /><Skeleton className="h-16 w-full rounded-[var(--radius-control)]" /></div>
            </section>
        </div>
    )
}

function WorkspaceFieldSkeleton() {
    return <div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-11 w-full rounded-[var(--radius-control)]" /></div>
}

function BootHeader() {
    return (
        <header className="sticky top-0 z-10 flex min-h-16 shrink-0 items-center border-b border-primary-foreground/10 bg-hero-overlay px-[var(--layout-public-gutter)] text-primary-foreground" aria-label="Навигация AutoCare Hub">
            <div className="mx-auto flex w-full max-w-[var(--layout-public-wide-max)] items-center justify-between gap-4">
                <BrandLogo size="sm" />
                <nav className="hidden items-center gap-6 text-xs font-semibold text-primary-foreground/75 lg:flex" aria-label="Основная навигация">
                    <a href="/services" className="cursor-pointer transition-colors hover:text-primary">Автоуслуги</a>
                    <a href="/reviews" className="cursor-pointer transition-colors hover:text-primary">Отзывы</a>
                    <a href="/help" className="cursor-pointer transition-colors hover:text-primary">Помощь и информация</a>
                </nav>
                <div className="flex items-center gap-2" aria-hidden="true">
                    <span className="hidden h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-primary-foreground/20 bg-primary-foreground/5 px-3 text-xs font-semibold sm:inline-flex"><MapPin className="size-3.5" />Москва<ChevronDown className="size-3" /></span>
                    <span className="hidden h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-primary-foreground/20 bg-primary-foreground/5 px-3 text-xs font-semibold sm:inline-flex">RU<ChevronDown className="size-3" /></span>
                    <span className="flex h-9 items-center gap-1.5 rounded-full border border-primary-foreground/20 bg-primary-foreground/5 px-2 text-primary-foreground/85"><Sun className="size-4" /><Moon className="size-4" /></span>
                    <span className="inline-flex size-9 items-center justify-center rounded-[var(--radius-control)] border border-primary-foreground/20 bg-primary-foreground/5 lg:hidden"><Menu className="size-4" /></span>
                    <Skeleton aria-hidden="true" className="size-9 rounded-full bg-primary-foreground/15" />
                </div>
            </div>
        </header>
    )
}

function ServicesBootContent() {
    return (
        <>
            <section className="relative left-1/2 w-screen -translate-x-1/2 bg-hero-overlay text-primary-foreground">
                <div className="mx-auto w-full max-w-[var(--layout-operational-max)] px-[var(--layout-gutter)] py-5 sm:py-6">
                    <section aria-busy="true" aria-label="Загрузка поиска автоуслуг" className="rounded-[var(--radius-panel)] border border-primary-foreground/15 bg-primary-foreground/[0.07] p-3 shadow-lg shadow-black/10 sm:p-4">
                        <BootDiscoveryControls />
                    </section>
                </div>
            </section>
            <div className="mx-auto w-full max-w-[var(--layout-operational-max)] px-[var(--layout-gutter)] py-7 sm:py-9">
                <div className="space-y-2" aria-hidden="true">
                    <Skeleton data-testid="autocare-results-title-skeleton" className="h-7 w-72 max-w-full" />
                    <Skeleton data-testid="autocare-results-description-skeleton" className="h-4 w-[28rem] max-w-full" />
                </div>
                <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.04fr)_minmax(360px,0.76fr)]">
                    <div className="order-2 grid gap-4 lg:order-1">
                        {Array.from({ length: 4 }, (_, index) => <BootProviderCard key={index} />)}
                    </div>
                    <div data-testid="autocare-results-map-skeleton" className="autocare-map-skeleton order-1 min-h-[420px] rounded-[var(--radius-panel)] border border-border lg:order-2 lg:min-h-[min(70vh,720px)]" />
                </div>
            </div>
        </>
    )
}

function BootDiscoveryControls() {
    return (
        <div>
            <div className="divide-y divide-primary-foreground/15">
                <BootSearchFormSection icon={Wrench} title="Услуга">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1.45fr)_minmax(9rem,0.55fr)]">
                        <BootDiscoverySelect label="Какая услуга нужна?" value="Выберите услугу, например, Замена тормозных колодок" />
                        <BootDiscoverySelect label="Радиус поиска" value="25 км" />
                    </div>
                </BootSearchFormSection>
                <BootSearchFormSection icon={CarFront} title="Автомобиль">
                    <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(8rem,0.55fr)]">
                        <BootDiscoverySelect label="Марка" value="Любая марка" />
                        <BootDiscoverySelect label="Модель" value="Любая модель" />
                        <BootDiscoverySelect label="Год выпуска" value="Любой год" />
                    </div>
                </BootSearchFormSection>
                <BootSearchFormSection icon={SlidersHorizontal} title="Все фильтры">
                    <div className="flex flex-wrap items-center gap-2">
                        {['Цена', 'Рейтинг 4,5+', 'До 10 км', 'Есть запись сегодня', 'Все фильтры'].map((label) => <button key={label} type="button" disabled className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-primary-foreground/20 bg-primary-foreground/[0.08] px-3 text-xs font-bold text-primary-foreground/80 opacity-60">{label}</button>)}
                    </div>
                </BootSearchFormSection>
            </div>
            <div className="mt-4 border-t border-primary-foreground/15 pt-3">
                <p className="text-xs font-black text-primary-foreground">Параметры поиска</p>
                <p className="mt-2 text-xs font-medium text-primary-foreground/55">Дополнительные фильтры не выбраны</p>
            </div>
            <p className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-primary-foreground/55"><ShieldCheck className="size-4 text-primary" />Мы не передаём ваши данные третьим лицам</p>
            <div className="mt-4 flex justify-end border-t border-primary-foreground/15 pt-4">
                <button type="button" disabled className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-5 text-sm font-black text-primary-foreground opacity-60 sm:w-auto sm:min-w-52"><Search className="size-4" />Начать поиск</button>
            </div>
        </div>
    )
}

function BootSearchFormSection({ icon: Icon, title, children }: { icon: typeof Wrench; title: string; children: ReactNode }) {
    return <section className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 py-3.5 first:pt-0 last:pb-0 sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-4 sm:py-4" aria-label={title}>
        <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary sm:size-10"><Icon className="size-4 sm:size-5" aria-hidden="true" /></span>
        <div className="min-w-0"><h2 className="text-sm font-black text-primary-foreground">{title}</h2><div className="mt-2.5 min-w-0">{children}</div></div>
    </section>
}

function BootDiscoverySelect({ label, value }: { label: string; value: string }) {
    return <FloatingSelect floatLabelWhenEmpty label={label} tone="dark" value="" disabled aria-label={label}><option value="">{value}</option></FloatingSelect>
}

function BootProviderCard() {
    return <div className="min-h-52 rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div className="flex gap-4"><Skeleton className="size-24 rounded-[var(--radius-card)]" /><div className="min-w-0 flex-1"><Skeleton className="h-5 w-2/5" /><Skeleton className="mt-3 h-3.5 w-4/5" /><Skeleton className="mt-2 h-3.5 w-full" /><Skeleton className="mt-2 h-3.5 w-3/5" /></div></div><div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4"><Skeleton className="h-4 w-28" /><Skeleton className="h-10 w-44 rounded-[var(--radius-control)]" /></div></div>
}

function GenericBootContent() {
    return <div className="mx-auto w-full max-w-[var(--layout-operational-max)] px-[var(--layout-gutter)] py-7 lg:py-10"><div className="space-y-3"><Skeleton className="h-3 w-36" /><Skeleton className="h-10 w-2/3 max-w-xl" /><Skeleton className="h-4 w-full max-w-2xl" /></div><div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]"><Skeleton className="h-64 rounded-[var(--radius-panel)]" /><Skeleton className="h-64 rounded-[var(--radius-panel)]" /></div></div>
}

/**
 * The landing map is a bundled visual, not API data. Rendering it in the
 * server/client boot shell prevents a blank or skeleton-covered hero while
 * Next prepares the interactive application.
 */
function HomeBootContent() {
    return (
        <>
            <section data-testid="home-boot-hero" className="relative isolate min-h-[650px] overflow-hidden bg-hero-overlay text-primary-foreground lg:h-[735px]">
                <img
                    src="/images/autocare/hero-map-generated.webp"
                    alt=""
                    aria-hidden="true"
                    fetchPriority="high"
                    className="absolute inset-0 h-full w-full object-cover object-center"
                />
                <div className="pointer-events-none absolute inset-0 bg-hero-overlay/15" aria-hidden="true" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-hero-overlay via-hero-overlay/85 to-hero-overlay/5 lg:via-[41%] lg:to-[68%]" aria-hidden="true" />
                <div className="pointer-events-none absolute left-[71%] top-[48%] size-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/50 bg-primary/15 shadow-[0_0_34px_var(--hero-glow)] lg:size-56" aria-hidden="true">
                    <span className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-primary-foreground bg-primary shadow-[0_0_16px_var(--primary)]" />
                </div>
                <div className="relative z-10 mx-auto h-full max-w-[var(--layout-public-wide-max)] px-[var(--layout-public-gutter)] pt-11 lg:pt-[46px]">
                    <div className="max-w-[545px]">
                        <h1 className="max-w-[520px] text-[clamp(2.25rem,3.05vw,2.72rem)] font-black leading-[1.17] tracking-[-0.035em]">Найдите лучший<br />автосервис рядом</h1>
                        <p className="mt-3 max-w-[520px] text-[clamp(1.25rem,1.8vw,1.58rem)] font-extrabold leading-[1.35] text-primary">Сравните цены, рейтинги и время<br className="hidden sm:block" /> записи за пару кликов</p>
                        <div className="mt-6 grid grid-cols-3 gap-4 text-xs font-semibold leading-[1.2] text-primary-foreground/90">
                            <span>Только проверенные<br />автосервисы</span>
                            <span>Честные отзывы<br />реальных клиентов</span>
                            <span>Быстрая запись<br />онлайн</span>
                        </div>
                        <HomeBootSearchForm />
                    </div>
                </div>
            </section>
            <HomeBootRemoteContent />
        </>
    )
}

/**
 * The hero itself is bundled UI. These are the sections that wait for
 * discovery, zones and reviews, so only they reserve their final shapes.
 */
function HomeBootRemoteContent() {
    return (
        <div aria-busy="true" aria-label="Загрузка данных главной страницы" className="bg-background py-[22px]">
            <section className="mx-auto max-w-[var(--layout-public-max)] px-[var(--layout-gutter)]">
                <div className="flex items-end justify-between gap-6">
                    <div className="rounded-[var(--radius-control)] bg-card/95 px-4 py-3 shadow-sm">
                        <h2 className="text-[1.5rem] font-black tracking-[-0.025em]">Сравните автосервисы и выберите лучший вариант</h2>
                        <p className="mt-2 text-sm text-muted-foreground">Загрузка предложений рядом с вами</p>
                    </div>
                    <span className="hidden h-10 w-40 rounded-[7px] border border-border bg-card md:block" />
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-4">
                    {Array.from({ length: 4 }, (_, index) => <BootHomeProviderCard key={index} />)}
                </div>
            </section>
            <section className="mx-auto mt-4 grid max-w-[var(--layout-public-max)] gap-4 px-[var(--layout-gutter)] lg:grid-cols-[1.05fr_0.97fr_1.05fr]">
                <BootCategoryGrid />
                <div className="min-h-[334px] rounded-[10px] bg-card p-5"><h2 className="text-lg font-black">Исследуйте по локации</h2><div className="mt-4 grid gap-2">{Array.from({ length: 4 }, (_, index) => <div key={index} className="flex h-[52px] items-center gap-3"><Skeleton className="h-[52px] w-[73px] rounded-[7px]" /><div className="grid flex-1 gap-2"><Skeleton className="h-3.5 w-3/5" /><Skeleton className="h-3 w-2/5" /></div></div>)}</div></div>
                <BootPartnerCard />
            </section>
            <section className="mx-auto mt-6 max-w-[var(--layout-public-max)] px-[var(--layout-gutter)]"><div className="rounded-[var(--radius-panel)] bg-card p-5"><div className="flex items-center justify-between gap-4"><h2 className="text-lg font-black">Что говорят наши клиенты</h2><span className="text-xs font-semibold text-primary">Все отзывы</span></div><div className="mt-4 grid gap-4 md:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-44 w-full rounded-[var(--radius-card)]" />)}</div></div></section>
        </div>
    )
}

function BootHomeProviderCard() {
    return <article aria-hidden="true" className="flex min-h-[352px] flex-col rounded-[9px] border border-border bg-card px-4 pb-4 pt-5"><div className="flex items-center gap-2"><Skeleton className="size-6 rounded-[6px]" /><Skeleton className="h-4 w-2/5" /></div><Skeleton className="mt-3 h-3.5 w-4/5" /><Skeleton className="mt-3 h-3 w-full" /><Skeleton className="mt-6 h-5 w-2/5" /><Skeleton className="mt-2 h-3 w-1/2" /><Skeleton className="mt-5 h-3 w-28" /><Skeleton className="mt-2 h-4 w-2/5" /><Skeleton className="mt-auto h-[42px] w-full rounded-[6px]" /><Skeleton className="mx-auto mt-3 h-3 w-16" /></article>
}

const bootCategories = [
    ['Техобслуживание', Wrench],
    ['Диагностика', Search],
    ['Шиномонтаж', CircleGauge],
    ['Электрика', Zap],
    ['Эвакуатор', Truck],
    ['Аккумуляторы', Battery],
] as const

function BootCategoryGrid() {
    return <section className="min-h-[334px] rounded-[10px] bg-card p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black">Популярные автоуслуги</h2><span className="text-xs font-semibold text-primary">Все услуги</span></div><div className="mt-5 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4">{bootCategories.map(([label, Icon]) => <div key={label} className="grid justify-items-center gap-2 text-center"><span className="flex size-12 items-center justify-center rounded-[9px] bg-secondary/55 text-primary"><Icon className="size-6 stroke-[1.8]" /></span><span className="text-[0.7rem] font-semibold leading-[1.25]">{label}</span></div>)}</div></section>
}

function BootPartnerCard() {
    return <section className="relative min-h-[334px] overflow-hidden rounded-[10px] bg-hero-overlay px-6 py-5 text-primary-foreground"><img src="/images/autocare/partner-handshake.webp" alt="" className="absolute inset-0 h-full w-full object-cover object-[64%_center]" /><div className="absolute inset-0 bg-gradient-to-r from-hero-overlay via-hero-overlay/85 to-hero-overlay/20" /><div className="relative max-w-[18rem]"><h2 className="text-xl font-black">Вы владелец автосервиса?</h2><p className="mt-3 text-sm leading-6 text-primary-foreground/85">Присоединяйтесь к AutoCare Hub и находите новых клиентов.</p><ul className="mt-5 grid gap-3 text-sm font-semibold"><li className="flex items-center gap-3"><ShieldCheck className="size-5 text-map-marker-success" />Больше клиентов каждый день</li><li className="flex items-center gap-3"><ShieldCheck className="size-5 text-map-marker-success" />Удобное управление заявками</li></ul><span className="mt-6 inline-flex h-12 items-center rounded-[7px] bg-primary px-7 text-base font-bold">Стать партнёром</span></div></section>
}

function HomeBootSearchForm() {
    return (
        <form aria-busy="true" aria-label="Подготовка поиска автоуслуг" className="mt-6 overflow-hidden rounded-[12px] border-[5px] border-primary-foreground/20 bg-transparent text-foreground shadow-2xl shadow-black/30">
            <div className="grid grid-cols-2 bg-map-overlay/65 text-primary-foreground backdrop-blur-[2px]">
                <span className="flex h-[52px] items-center justify-center gap-2 rounded-tr-[10px] bg-background text-base font-black text-primary"><Wrench className="size-5" />По услуге</span>
                <span className="flex h-[52px] items-center justify-center gap-2 text-base font-black text-primary-foreground/85"><ShieldCheck className="size-5" />По автосервису</span>
            </div>
            <div className="bg-background px-5 pb-3 pt-4">
                <BootSearchSelect label="Какая услуга нужна?" value="Выберите услугу, например, Замена тормозных колодок" />
                <div className="mt-3 grid grid-cols-[1.48fr_0.72fr] gap-3">
                    <BootSearchSelect label="Где вы находитесь?" value="Москва, Россия" />
                    <BootSearchSelect label="Радиус поиска" value="10 км" />
                </div>
                <button type="button" disabled className="mt-3 flex h-[48px] w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary text-base font-black text-primary-foreground opacity-80"><Search className="size-[18px]" />Найти рядом</button>
                <p className="mt-3 text-sm font-semibold text-muted-foreground">3 216 автосервисов рядом готовы помочь</p>
            </div>
        </form>
    )
}

function BootSearchSelect({ label, value }: { label: string; value: string }) {
    return (
        <label className="grid gap-1.5 text-[0.78rem] font-semibold">
            {label}
            <span className="relative flex h-[44px] items-center rounded-[var(--radius-control)] border border-border bg-background px-3 pr-9 text-sm text-muted-foreground">
                <span className="truncate">{value}</span>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2" aria-hidden="true" />
            </span>
        </label>
    )
}

function BootFooter() {
    return <footer className="flex min-h-40 shrink-0 items-end bg-hero-overlay px-[var(--layout-gutter)] py-8 text-primary-foreground"><div className="mx-auto flex w-full max-w-[var(--layout-public-max)] items-center justify-between gap-6" aria-hidden="true"><BrandLogo size="sm" /><div className="hidden gap-6 text-xs font-semibold text-primary-foreground/70 sm:flex"><span>Для клиентов</span><span>Для владельцев</span><span>Правовая информация</span></div></div></footer>
}
