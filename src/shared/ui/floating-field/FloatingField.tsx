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
type FloatingInputProps = FloatingFieldBaseProps & InputHTMLAttributes<HTMLInputElement> & {
    floatLabelWhenEmpty?: boolean
}

const toneClasses: Record<FloatingFieldTone, { wrapper: string; label: string; labelSurface: string; control: string; placeholder: string }> = {
    light: {
        wrapper: 'border-border bg-background text-foreground focus-within:ring-offset-background',
        label: 'text-muted-foreground',
        labelSurface: 'bg-background',
        control: 'text-foreground disabled:text-muted-foreground',
        placeholder: 'text-muted-foreground',
    },
    dark: {
        wrapper: 'border-primary-foreground/15 bg-primary-foreground/[0.04] text-primary-foreground focus-within:ring-offset-hero-overlay',
        // The label plate uses the same semantic dark surface as the search
        // form, keeping the border clean without a light-theme flash.
        label: 'text-primary-foreground',
        labelSurface: 'bg-hero-overlay',
        control: 'text-primary-foreground disabled:text-muted-foreground [&>option]:bg-hero-overlay [&>option]:text-primary-foreground',
        // Dark-tone fields are used on the navy search surface even when the
        // application itself is in light mode. Keep empty values readable
        // instead of inheriting the light theme's dark muted foreground.
        placeholder: 'text-primary-foreground/65',
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
                'pointer-events-none absolute left-3 z-10 origin-left whitespace-nowrap rounded-[3px] px-1 text-xs font-bold leading-none transition-[color,transform,top] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)]',
                'group-focus-within:top-0 group-focus-within:-translate-y-1/2 group-focus-within:scale-90 group-focus-within:text-primary',
                toneClasses[tone].label,
                toneClasses[tone].labelSurface,
                filled ? 'top-0 -translate-y-1/2 scale-90' : 'top-1/2 -translate-y-1/2 scale-100',
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
                    'select-with-icon h-12 w-full appearance-none bg-transparent text-sm font-bold outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60',
                    // When an empty field receives focus, the label moves onto
                    // the border. Give the selected value the same top inset
                    // as a filled field so the two texts never collide.
                    filled ? 'pb-1 pt-5' : 'pb-1 pt-4 group-focus-within:pt-5',
                    leadingAdornment ? 'pl-9 pr-9' : 'px-3 pr-9',
                    toneClasses[tone].control,
                    !hasValue && toneClasses[tone].placeholder,
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

export function FloatingInput({ className, floatLabelWhenEmpty = false, label, leadingAdornment, tone = 'light', value, defaultValue, wrapperClassName, ...props }: FloatingInputProps) {
    const filled = isFilled(value ?? defaultValue)
    const labelIsFloated = floatLabelWhenEmpty || filled

    return (
        <label data-filled={labelIsFloated} className={getWrapperClassName(tone, labelIsFloated, wrapperClassName)}>
            <FloatingLabel label={label} tone={tone} filled={labelIsFloated} />
            {leadingAdornment ? <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-primary" aria-hidden="true">{leadingAdornment}</span> : null}
            <input
                value={value}
                defaultValue={defaultValue}
                placeholder=" "
                className={cn(
                    // Keep focus treatment on the rounded field wrapper; a
                    // second native ring would have square corners.
                    'h-12 w-full bg-transparent text-sm font-bold outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-transparent focus:placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60',
                    // Match the select behavior: once the floating label is
                    // lifted on focus, reserve a full line for the input text.
                    labelIsFloated ? 'pb-1 pt-5' : 'pb-1 pt-4 group-focus-within:pt-5',
                    leadingAdornment ? 'pl-9 pr-3' : 'px-3',
                    toneClasses[tone].control,
                    className,
                )}
                {...props}
            />
        </label>
    )
}
