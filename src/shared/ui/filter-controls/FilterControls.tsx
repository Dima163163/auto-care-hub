import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

type FilterFieldProps = {
    label: ReactNode
    children: ReactNode
    className?: string
    as?: 'div' | 'label'
}

export function FilterField({
    label,
    children,
    className,
    as = 'label',
}: FilterFieldProps) {
    const FieldElement = as

    return (
        <FieldElement className={cn('text-sm font-semibold', className)}>
            {label}
            {children}
        </FieldElement>
    )
}

export function FilterInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className={cn(
                'mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none ring-primary focus:ring-2 aria-[invalid=true]:border-status-danger-border aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-status-danger-border/30',
                className,
            )}
        />
    )
}

export function FilterSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            {...props}
            className={cn(
                'mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none ring-primary focus:ring-2 aria-[invalid=true]:border-status-danger-border aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-status-danger-border/30',
                className,
            )}
        />
    )
}
