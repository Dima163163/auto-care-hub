import type { ReactNode } from 'react'

type ClientBookingFieldProps = {
    children: ReactNode
    error?: string | undefined
    errorId?: string | undefined
    htmlFor: string
    label: string
}

export function ClientBookingField({
    children,
    error,
    errorId,
    htmlFor,
    label,
}: ClientBookingFieldProps) {
    return (
        <div className="space-y-2">
            <label htmlFor={htmlFor} className="text-sm font-medium">
                {label}
            </label>

            {children}

            {error && (
                <p id={errorId} className="text-sm text-destructive">
                    {error}
                </p>
            )}
        </div>
    )
}
