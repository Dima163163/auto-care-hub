import { CalendarCheck2, CarFront, CircleCheckBig, MapPinCheck } from 'lucide-react'

import { useTranslation } from '@/shared/lib/useTranslation'

const steps = [
    { icon: CarFront, titleKey: 'autocare.stepChooseTitle', textKey: 'autocare.stepChooseText' },
    { icon: MapPinCheck, titleKey: 'autocare.stepCompareTitle', textKey: 'autocare.stepCompareText' },
    { icon: CalendarCheck2, titleKey: 'autocare.stepBookTitle', textKey: 'autocare.stepBookText' },
    { icon: CircleCheckBig, titleKey: 'autocare.stepVisitTitle', textKey: 'autocare.stepVisitText' },
] as const

export function HomeProcessSection() {
    const { t } = useTranslation()

    return (
        <section className="mx-auto w-full max-w-[var(--layout-public-max)] px-[var(--layout-gutter)] pb-7">
            <div className="inline-block rounded-[var(--radius-control)] bg-card/95 px-4 py-3 shadow-sm backdrop-blur-sm">
                <h2 className="text-[1.35rem] font-black">{t('autocare.howItWorks')}</h2>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
                {steps.map((step, index) => (
                    <article key={step.titleKey} className="flex min-h-[132px] gap-4 rounded-[var(--radius-panel)] border border-border bg-card p-4 shadow-sm">
                        <step.icon className="mt-1 size-8 shrink-0 text-primary" />
                        <div>
                            <p className="text-xl font-black leading-none">{index + 1}</p>
                            <h3 className="mt-1 text-sm font-black">{t(step.titleKey)}</h3>
                            <p className="mt-2 max-w-[14rem] text-xs leading-[1.55] text-muted-foreground">{t(step.textKey)}</p>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    )
}
