import { useState, type ComponentType, type SVGProps } from 'react'
import { CalendarCheck2, ShieldCheck } from 'lucide-react'

import { useTranslation } from '@/shared/lib/useTranslation'

import { AutoCareHeroMap } from './AutoCareHeroMap'
import { AutoCareSearchForm } from './AutoCareSearchForm'

export function AutoCareHero() {
    const { t } = useTranslation()
    const [marketId, setMarketId] = useState('ru-moscow')

    return (
        <section className="relative isolate min-h-[650px] overflow-hidden bg-hero-overlay text-primary-foreground lg:h-[735px]">
            <AutoCareHeroMap />
            <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-hero-overlay via-hero-overlay/85 to-hero-overlay/5 lg:via-[41%] lg:to-[68%]" aria-hidden="true" />
            <div className="relative z-10 mx-auto h-full max-w-[1416px] px-[clamp(1rem,3.7vw,3.5rem)] pt-11 lg:pt-[46px]">
                <div className="max-w-[545px]">
                    <h1 className="max-w-[520px] text-[clamp(2.25rem,3.05vw,2.72rem)] font-black leading-[1.17] tracking-[-0.035em]">{t('autocare.heroTitle')}</h1>
                    <p className="mt-3 max-w-[520px] text-[clamp(1.25rem,1.8vw,1.58rem)] font-extrabold leading-[1.35] text-primary">{t('autocare.heroDescription')}</p>
                    <div className="mt-6 grid grid-cols-3 gap-4 text-xs font-semibold leading-[1.2] text-primary-foreground/90">
                        <TrustItem icon={ShieldCheck} label={t('autocare.verifiedTrust')} />
                        <TrustItem icon={VerifiedReviewIcon} label={t('autocare.realReviewsTrust')} />
                        <TrustItem icon={CalendarCheck2} label={t('autocare.fastBookingTrust')} />
                    </div>
                    <div className="mt-6"><AutoCareSearchForm marketId={marketId} onMarketChange={setMarketId} /></div>
                </div>
            </div>
        </section>
    )
}

type TrustIcon = ComponentType<SVGProps<SVGSVGElement>>

function TrustItem({ icon: Icon, label }: { icon: TrustIcon; label: string }) {
    return <span className="flex items-center gap-2.5"><Icon className="size-6 shrink-0 text-primary-foreground" />{label}</span>
}

const VerifiedReviewIcon: TrustIcon = ({ className, ...props }) => (
    <svg {...props} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 17.5 3.5 20v-4.7A7.7 7.7 0 0 1 2 10.8C2 6.5 6.5 3 12 3s10 3.5 10 7.8-4.5 7.7-10 7.7c-1.8 0-3.5-.3-5-.9Z" />
        <path d="m8.2 10.8 2.2 2.2 5.4-5.2" />
    </svg>
)
