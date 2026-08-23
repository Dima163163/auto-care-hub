import { CalendarDays } from 'lucide-react'
import { useRef } from 'react'

type DateInputElement = HTMLInputElement & { showPicker?: () => void }

export type DateInputTriggerProps = {
    label: string
    value: string
    min?: string
    className?: string
    onChange: (value: string) => void
}

export function DateInputTrigger({ label, value, min, className = '', onChange }: DateInputTriggerProps) {
    const inputRef = useRef<HTMLInputElement>(null)

    const openPicker = () => {
        const input = inputRef.current as DateInputElement | null
        if (!input) return

        try {
            if (typeof input.showPicker === 'function') {
                input.showPicker()
                return
            }
        } catch {
            // Some browsers reject showPicker outside a trusted user gesture.
        }

        input.focus()
        input.click()
    }

    return (
        <div className={className}>
            <button
                type="button"
                aria-haspopup="dialog"
                aria-label={label}
                onClick={openPicker}
                className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-control)] border border-border bg-background text-xs font-bold text-foreground transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
            >
                <CalendarDays className="size-4 text-primary" aria-hidden="true" />
                {label}
            </button>
            <input
                ref={inputRef}
                type="date"
                min={min}
                value={value}
                tabIndex={-1}
                aria-label={`${label} input`}
                onChange={(event) => onChange(event.target.value)}
                className="pointer-events-none absolute size-px opacity-0"
            />
        </div>
    )
}
