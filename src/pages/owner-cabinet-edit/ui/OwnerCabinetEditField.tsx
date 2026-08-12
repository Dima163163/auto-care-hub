import type { ReactNode } from 'react'

type OwnerCabinetEditFieldProps = {
    children: ReactNode
    error?: string | undefined
    htmlFor: string
    label: string
}

export function OwnerCabinetEditField({
    children,
    error,
    htmlFor,
    label,
}: OwnerCabinetEditFieldProps) {
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
