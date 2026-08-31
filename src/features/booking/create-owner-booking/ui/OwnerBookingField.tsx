import type { ReactNode } from 'react'

type OwnerBookingFieldProps = {
    children: ReactNode
    error?: string | undefined
    errorId?: string | undefined
    htmlFor: string
    label: string
    wide?: boolean | undefined
}

export function OwnerBookingField({
    children,
    error,
    errorId,
    htmlFor,
    label,
    wide = false,
}: OwnerBookingFieldProps) {
    return (
        <div className={wide ? 'lg:col-span-2' : undefined}>
            <label htmlFor={htmlFor} className="text-sm font-medium">
                {label}
            </label>

            {children}

            {error && (
                <p id={errorId} role="alert" className="mt-2 text-sm text-destructive">
                    {error}
                </p>
            )}
        </div>
    )
}
