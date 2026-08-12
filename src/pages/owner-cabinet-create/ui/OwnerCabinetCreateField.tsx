import type { ReactNode } from 'react'

type OwnerCabinetCreateFieldProps = {
    children: ReactNode
    error?: string | undefined
    htmlFor: string
    label: string
}

export function OwnerCabinetCreateField({
    children,
    error,
    htmlFor,
    label,
}: OwnerCabinetCreateFieldProps) {
    return (
        <div>
            <label htmlFor={htmlFor} className="text-sm font-medium">
                {label}
            </label>

            {children}

            {error && (
                <p className="mt-2 text-sm text-destructive">
                    {error}
                </p>
            )}
        </div>
    )
}
