import { Component, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { useLocation } from 'react-router'

import { Button } from '@/components/ui/button'
import { StateCard } from '@/shared/ui/state-card'
import { useTranslation } from '@/shared/lib/useTranslation'

type RouteErrorBoundaryProps = {
    children: ReactNode
    resetKey: string
    title: string
    description: string
    retryLabel: string
}

type RouteErrorBoundaryState = {
    hasError: boolean
}

class RouteErrorBoundaryInner extends Component<
    RouteErrorBoundaryProps,
    RouteErrorBoundaryState
> {
    state: RouteErrorBoundaryState = { hasError: false }

    static getDerivedStateFromError(): RouteErrorBoundaryState {
        return { hasError: true }
    }

    componentDidUpdate(previousProps: RouteErrorBoundaryProps) {
        if (previousProps.resetKey !== this.props.resetKey && this.state.hasError) {
            this.setState({ hasError: false })
        }
    }

    handleRetry = () => {
        window.location.reload()
    }

    render() {
        if (this.state.hasError) {
            return (
                <main className="min-h-screen bg-background px-4 py-8 lg:px-8">
                    <section className="mx-auto max-w-6xl">
                        <StateCard
                            variant="error"
                            title={this.props.title}
                            description={this.props.description}
                            action={(
                                <Button type="button" onClick={this.handleRetry}>
                                    <RefreshCw className="size-4" />
                                    {this.props.retryLabel}
                                </Button>
                            )}
                        />
                    </section>
                </main>
            )
        }

        return this.props.children
    }
}

export function RouteErrorBoundary({ children }: { children: ReactNode }) {
    const { t } = useTranslation()
    const location = useLocation()
    const resetKey = `${location.key}:${location.pathname}:${location.search}`

    return (
        <RouteErrorBoundaryInner
            resetKey={resetKey}
            title={t('routeError.title')}
            description={t('routeError.description')}
            retryLabel={t('routeError.retry')}
        >
            {children}
        </RouteErrorBoundaryInner>
    )
}
