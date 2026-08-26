import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

type FloatingFieldTone = 'light' | 'dark'

type FloatingFieldBaseProps = {
    label: string
    leadingAdornment?: ReactNode
    tone?: FloatingFieldTone
    wrapperClassName?: string
}

type FloatingSelectProps = FloatingFieldBaseProps & SelectHTMLAttributes<HTMLSelectElement> & {
    floatLabelWhenEmpty?: boolean
}
type FloatingInputProps = FloatingFieldBaseProps & InputHTMLAttributes<HTMLInputElement>

const toneClasses: Record<FloatingFieldTone, { wrapper: string; label: string; labelSurface: string; control: string }> = {
    light: {
        wrapper: 'border-border bg-background text-foreground focus-within:ring-offset-background',
        label: 'text-muted-foreground',
        labelSurface: 'bg-white',
        control: 'text-foreground disabled:text-muted-foreground',
    },
    dark: {
        wrapper: 'border-primary-foreground/15 bg-primary-foreground/[0.04] text-primary-foreground focus-within:ring-offset-hero-overlay',
        // The small label plate stays white for consistent legibility over
        // both themes; the field surface itself remains theme-specific.
        label: 'text-slate-700',
        labelSurface: 'bg-white',
        control: 'text-primary-foreground disabled:text-muted-foreground [&>option]:bg-hero-overlay [&>option]:text-primary-foreground',
    },
}

function isFilled(value: unknown) {
    return value !== undefined && value !== null && String(value).length > 0
}

function getWrapperClassName(tone: FloatingFieldTone, filled: boolean, wrapperClassName?: string) {
    const classes = toneClasses[tone]

    return cn(
        'group relative block min-w-0 rounded-[var(--radius-control)] border transition-[border-color,box-shadow,background-color] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)]',
        'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/50 focus-within:ring-offset-[var(--focus-ring-offset)]',
        classes.wrapper,
        wrapperClassName,
        filled && 'is-filled',
    )
}

function FloatingLabel({ label, tone, filled }: { label: string; tone: FloatingFieldTone; filled: boolean }) {
    return (
        <span
            className={cn(
                'pointer-events-none absolute left-3 top-1/2 z-10 origin-left -translate-y-1/2 rounded-[3px] px-1 text-xs font-bold transition-[color,transform,top] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)]',
                'group-focus-within:top-0 group-focus-within:-translate-y-1/2 group-focus-within:scale-90 group-focus-within:text-primary',
                toneClasses[tone].label,
                toneClasses[tone].labelSurface,
                filled && 'top-0 -translate-y-1/2 scale-90',
            )}
        >
            {label}
        </span>
    )
}

export function FloatingSelect({ children, className, floatLabelWhenEmpty = false, label, leadingAdornment, tone = 'light', value, defaultValue, wrapperClassName, ...props }: FloatingSelectProps) {
    const hasValue = isFilled(value ?? defaultValue)
    const filled = floatLabelWhenEmpty || hasValue

    return (
        <label data-filled={filled} className={getWrapperClassName(tone, filled, wrapperClassName)}>
            <FloatingLabel label={label} tone={tone} filled={filled} />
            {leadingAdornment ? <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-primary" aria-hidden="true">{leadingAdornment}</span> : null}
            <select
                value={value}
                defaultValue={defaultValue}
                className={cn(
                    // The wrapper owns the rounded focus ring. Suppress the
                    // global focus-visible ring on the native control so it
                    // cannot paint a square ring over the rounded field.
                    'select-with-icon h-12 w-full appearance-none bg-transparent pb-1 pt-4 text-sm font-bold outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60',
                    leadingAdornment ? 'pl-9 pr-9' : 'px-3 pr-9',
                    toneClasses[tone].control,
                    !hasValue && 'text-muted-foreground',
                    className,
                )}
                {...props}
            >
                {children}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-current opacity-65" aria-hidden="true" />
        </label>
    )
}

export function FloatingInput({ className, label, leadingAdornment, tone = 'light', value, defaultValue, wrapperClassName, ...props }: FloatingInputProps) {
    const filled = isFilled(value ?? defaultValue)

    return (
        <label data-filled={filled} className={getWrapperClassName(tone, filled, wrapperClassName)}>
            <FloatingLabel label={label} tone={tone} filled={filled} />
            {leadingAdornment ? <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-primary" aria-hidden="true">{leadingAdornment}</span> : null}
            <input
                value={value}
                defaultValue={defaultValue}
                placeholder=" "
                className={cn(
                    // Keep focus treatment on the rounded field wrapper; a
                    // second native ring would have square corners.
                    'h-12 w-full bg-transparent pb-1 pt-4 text-sm font-bold outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-transparent focus:placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60',
                    leadingAdornment ? 'pl-9 pr-3' : 'px-3',
                    toneClasses[tone].control,
                    className,
                )}
                {...props}
            />
        </label>
    )
}
