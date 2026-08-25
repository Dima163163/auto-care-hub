import type { ChangeEvent } from 'react'

type CommunicationSwitchProps = {
    id: string
    checked: boolean
    onChange: (event: ChangeEvent<HTMLInputElement>) => void
    label: string
    description?: string
    disabled?: boolean
    compact?: boolean
    testId?: string
}

export function CommunicationSwitch({ id, checked, onChange, label, description, disabled = false, compact = false, testId }: CommunicationSwitchProps) {
    return <label htmlFor={id} className={`flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-background ${compact ? 'px-3 py-2' : 'p-3'}`}>
        <span className="min-w-0"><span className="block text-xs font-black text-foreground">{label}</span>{description && <span className="mt-0.5 block text-[11px] leading-4 font-medium text-muted-foreground">{description}</span>}</span>
        <span className="relative shrink-0"><input id={id} data-testid={testId} type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={onChange} aria-label={label} className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" /><span aria-hidden="true" className="pointer-events-none block h-6 w-11 rounded-full bg-muted-foreground/30 transition-colors peer-checked:bg-primary peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-background after:transition-transform peer-checked:after:translate-x-full peer-checked:after:border-white rtl:peer-checked:after:-translate-x-full" /></span>
    </label>
}
