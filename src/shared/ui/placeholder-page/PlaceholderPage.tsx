type PlaceholderPageProps = {
    title: string
    description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
    return (
        <main className="min-h-screen bg-background px-4 py-10">
            <div className="mx-auto max-w-6xl">
                <div className="rounded-lg border bg-card p-8 shadow-sm">
                    <p className="text-sm font-medium text-muted-foreground">
                        AutoCare Hub
                    </p>

                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                        {title}
                    </h1>

                    <p className="mt-4 max-w-2xl text-muted-foreground">
                        {description}
                    </p>
                </div>
            </div>
        </main>
    )
}
