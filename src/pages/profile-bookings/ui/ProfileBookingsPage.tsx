import { CarFront, Heart, Headphones, History, Search, Star, Wrench } from 'lucide-react'
import { Link } from 'react-router'

import { useGetMeQuery } from '@/features/auth'
import { useGetMyAutoCareFleetsQuery } from '@/entities/automotive-service'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

import { AutoCareRequestsPanel } from './AutoCareRequestsPanel'

export function ProfileBookingsPage() {
    const { t } = useTranslation()

    return <main className="bg-background"><div className="@container mx-auto max-w-[var(--layout-public-max)] px-[var(--layout-gutter)] py-7 sm:py-10"><div className="grid min-w-0 gap-6"><section className="min-w-0"><h1 className="text-3xl font-black tracking-tight text-foreground">{t('autocare.clientRequestsTitle')}</h1><AutoCareRequestsPanel /></section><ClientSidebar /></div><ClientTrustStrip /></div></main>
}

function ClientSidebar() {
    const { t } = useTranslation()
    const { data: user } = useGetMeQuery()
    const { data: fleets } = useGetMyAutoCareFleetsQuery(undefined, { skip: user?.role !== 'client' })
    const vehicle = fleets?.flatMap((fleet) => fleet.vehicles)[0]
    const snapshot = vehicle?.vehicleSnapshot
    const vehicleTitle = [snapshot?.makeLabel ?? snapshot?.make ?? snapshot?.brand, snapshot?.modelLabel ?? snapshot?.model].filter(Boolean).join(' ')
    const vehicleMeta = [snapshot?.year, snapshot?.fuelType, snapshot?.plateNumber ?? snapshot?.registrationNumber].filter(Boolean).join(' · ')
    const quickActions = [{ icon: Search, title: t('autocare.clientNewRequest'), text: t('autocare.clientNewRequestText'), to: ROUTES.serviceDiscovery }, { icon: Heart, title: t('autocare.clientFavoritesAction'), text: t('autocare.clientFavoritesText'), to: ROUTES.favorites }, { icon: History, title: t('autocare.clientMessagesAction'), text: t('autocare.clientMessagesText'), to: ROUTES.profileBookings }, { icon: Headphones, title: t('autocare.clientSupportAction'), text: t('autocare.clientSupportText'), to: ROUTES.help }]
    return <aside className="grid min-w-0 gap-4 @min-[40rem]:grid-cols-2"><section className="rounded-[var(--radius-panel)] border border-border bg-card p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><h2 className="text-sm font-black text-foreground">{t('autocare.clientVehiclesTitle')}</h2><Link to={ROUTES.profileVehicles} className="text-[11px] font-black text-primary">{t('autocare.clientVehiclesAdd')}</Link></div><div className="mt-4 rounded-[var(--radius-card)] bg-secondary p-3"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-full bg-hero-overlay text-primary-foreground"><CarFront className="size-4" /></span><div><p className="text-xs font-black text-foreground">{vehicleTitle || t('autocare.clientVehiclesEmpty')}</p>{vehicleMeta ? <p className="mt-1 text-[10px] font-bold text-muted-foreground">{vehicleMeta}</p> : null}</div></div></div><Link to={ROUTES.profileVehicles} className="mt-3 inline-flex text-xs font-black text-primary">{t('autocare.clientVehiclesAll')}</Link></section><section className="rounded-[var(--radius-panel)] border border-border bg-card p-4 shadow-sm"><h2 className="text-sm font-black text-foreground">{t('autocare.clientQuickActions')}</h2><div className="mt-3 grid gap-1">{quickActions.map(({ icon: Icon, title, text, to }) => <Link key={title} to={to} className="flex gap-3 rounded-[var(--radius-control)] p-2.5 hover:bg-secondary"><span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><Icon className="size-4" /></span><span><span className="block text-xs font-black text-foreground">{title}</span><span className="mt-0.5 block text-[10px] font-semibold leading-4 text-muted-foreground">{text}</span></span></Link>)}</div></section></aside>
}

function ClientTrustStrip() {
    const { t } = useTranslation()
    const items = [{ icon: Wrench, title: t('autocare.clientFooterTrusted'), text: t('autocare.clientFooterTrustedText') }, { icon: Star, title: t('autocare.clientFooterReviews'), text: t('autocare.clientFooterReviewsText') }, { icon: CarFront, title: t('autocare.clientFooterConvenient'), text: t('autocare.clientFooterConvenientText') }, { icon: Search, title: t('autocare.clientFooterDirect'), text: t('autocare.clientFooterDirectText') }]
    return <section className="mt-10 rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><h2 className="text-lg font-black text-foreground">{t('autocare.clientFooterTitle')}</h2><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{items.map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-card)] bg-primary/10 text-primary"><Icon className="size-4" /></span><p className="text-xs font-bold leading-5 text-foreground"><span className="block">{title}</span><span className="block font-medium text-muted-foreground">{text}</span></p></div>)}</div></section>
}
