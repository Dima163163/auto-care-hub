import { Check } from 'lucide-react'

import { useTranslation } from '@/shared/lib/useTranslation'

export function RequestSteps({ submitted }: { submitted: boolean }) {
    const { t } = useTranslation()
    const steps = [t('autocare.requestStepService'), t('autocare.requestStepDetails'), t('autocare.requestStepConfirmation')]

    return <ol className="grid gap-2 sm:grid-cols-3">{steps.map((step, index) => <li key={step} className={`flex items-center gap-3 rounded-[var(--radius-card)] border px-3 py-3 text-xs font-bold ${submitted || index === 0 ? 'border-primary/30 bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}><span className="flex size-7 items-center justify-center rounded-full border border-current text-[11px]">{submitted || index === 0 ? <Check className="size-3.5" /> : index + 1}</span>{step}</li>)}</ol>
}
