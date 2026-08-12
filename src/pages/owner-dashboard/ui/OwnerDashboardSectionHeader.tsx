import { Link } from 'react-router'

type OwnerDashboardSectionHeaderProps = {
    description: string
    linkLabel: string
    title: string
    to: string
}

export function OwnerDashboardSectionHeader({
    description,
    linkLabel,
    title,
    to,
}: OwnerDashboardSectionHeaderProps) {
    return (
        <div className="mb-5 flex items-center justify-between gap-4">
            <div>
                <h2 className="text-xl font-semibold tracking-tight">
                    {title}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                    {description}
                </p>
            </div>

            <Link
                to={to}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
                {linkLabel}
            </Link>
        </div>
    )
}
