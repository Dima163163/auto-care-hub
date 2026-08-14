import { CarFront } from 'lucide-react'

import { ClientVehiclesSection } from '@/pages/profile/ui/ClientVehiclesSection'
import { useTranslation } from '@/shared/lib/useTranslation'
import { ProfileNavigation } from '@/widgets/profile-navigation/ui/ProfileNavigation'

export function ProfileVehiclesPage() {
    const { t } = useTranslation()

    return (
        <main className="mx-auto max-w-[var(--layout-operational-max)] space-y-6 px-[var(--layout-gutter)] py-7 lg:py-10">
            <ProfileNavigation />
            <header className="rounded-[var(--radius-panel)] bg-hero-overlay p-5 text-primary-foreground shadow-sm sm:p-6">
                <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-[var(--radius-control)] bg-primary-foreground/10 text-primary">
                        <CarFront className="size-5" />
                    </span>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground/60">AutoCare Hub</p>
                        <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{t('profile.vehicles.title')}</h1>
                    </div>
                </div>
                <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-primary-foreground/70">
                    {t('profile.vehicles.description')}
                </p>
            </header>
            <ClientVehiclesSection />
        </main>
    )
}
