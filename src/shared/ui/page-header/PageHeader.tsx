import type { ReactNode } from 'react'

type PageHeaderProps = {
    eyebrow?: string
    title: string
    description?: string
    actions?: ReactNode
}

export function PageHeader({
   eyebrow,
   title,
   description,
   actions,
}: PageHeaderProps) {
    return (
        <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div>
                {eyebrow && (
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                        {eyebrow}
                    </p>
                )}

                <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
                    {title}
                </h1>

                {description && (
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                        {description}
                    </p>
                )}
            </div>

            {actions && (
                <div className="flex shrink-0 items-center gap-2">
                    {actions}
                </div>
            )}
        </div>
    )
}
