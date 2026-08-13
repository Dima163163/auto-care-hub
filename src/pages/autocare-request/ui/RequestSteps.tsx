import { Check } from 'lucide-react'

import { useTranslation } from '@/shared/lib/useTranslation'

type RequestStepsProps = {
    submitted: boolean
}

export function RequestSteps({ submitted }: RequestStepsProps) {
    const { t } = useTranslation()
    const steps = [
        t('autocare.requestStepService'),
        t('autocare.requestDateTimeTitle'),
        t('autocare.requestStepDetails'),
        t('autocare.requestStepConfirmation'),
    ]

    return (
        <ol className="grid overflow-hidden rounded-[var(--radius-panel)] bg-card text-foreground shadow-sm sm:grid-cols-4">
            {steps.map((step, index) => {
                const isActive = submitted || index === 1

                return (
                    <li key={step} className="relative flex min-h-[74px] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                        <span className={isActive ? 'flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground' : 'flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-xs font-black text-muted-foreground'}>
                            {submitted && index === 3 ? <Check className="size-4" /> : index + 1}
                        </span>
                        <span className="min-w-0 text-xs font-black leading-4 sm:text-sm">{step}</span>
                    </li>
                )
            })}
        </ol>
    )
}
