import { CheckCircle2, CircleX } from 'lucide-react'

import type { Cabinet } from '@/entities/cabinet'
import { useTranslation } from '@/shared/lib/useTranslation'

type CabinetDetailsSummaryProps = {
    cabinet: Cabinet
}

function splitPolicy(value: string | null | undefined, fallback: string) {
    const lines = value?.split('\n').map((line) => line.trim()).filter(Boolean)
    return lines && lines.length > 0 ? lines : [fallback]
}

export function CabinetDetailsSummary({ cabinet }: CabinetDetailsSummaryProps) {
    const { t } = useTranslation()
    const cancellationItems = splitPolicy(
        cabinet.cancellationPolicy,
        t('cabinet.details.defaultCancellationPolicy'),
    )
    const ruleItems = splitPolicy(cabinet.houseRules, t('cabinet.details.defaultHouseRule'))

    return (
        <section className="border-t border-border/80 pt-4">
            <div className="grid gap-6 sm:grid-cols-2">
                <div>
                    <h2 className="text-sm font-semibold text-foreground">
                        {t('cabinet.details.cancellationPolicy')}
                    </h2>
                    <ul className="mt-3 grid gap-3">
                        {cancellationItems.map((item) => (
                            <li key={item} className="flex items-start gap-2 text-sm leading-5 text-muted-foreground">
                                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h2 className="text-sm font-semibold text-foreground">
                        {t('cabinet.details.houseRules')}
                    </h2>
                    <ul className="mt-3 grid gap-3">
                        {ruleItems.map((item) => (
                            <li key={item} className="flex items-start gap-2 text-sm leading-5 text-muted-foreground">
                                <CircleX className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    )
}
