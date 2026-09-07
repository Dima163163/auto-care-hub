import { useState } from 'react'
import { ArrowRight, CheckCircle2, Clock3, Mail, ShieldCheck, UsersRound } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'

import { Button } from '@/components/ui/button'
import {
    useAcceptAutoCareProviderInvitationMutation,
    type AutoCareProviderInvitationAcceptResponse,
} from '@/entities/automotive-service'
import { useGetMeQuery } from '@/features/auth'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { ROUTES, routePaths } from '@/shared/constants/routes'
import type { TranslationKey } from '@/shared/lib/i18n'
import { useTranslation } from '@/shared/lib/useTranslation'

type InvitationError = {
    status?: unknown
    data?: { statusCode?: unknown }
}

function getErrorStatus(error: unknown) {
    if (!error || typeof error !== 'object') return undefined

    const candidate = error as InvitationError
    if (typeof candidate.status === 'number') return candidate.status
    if (typeof candidate.data?.statusCode === 'number') return candidate.data.statusCode

    return undefined
}

function getRoleLabel(role: AutoCareProviderInvitationAcceptResponse['membership']['role'], t: (key: TranslationKey) => string) {
    return role === 'manager'
        ? t('autocare.ownerInvitationRoleManager')
        : t('autocare.ownerInvitationRoleStaff')
}

export function OwnerProviderInvitationAcceptPage() {
    const { t } = useTranslation()
    const [searchParams] = useSearchParams()
    const { data: user } = useGetMeQuery()
    const [acceptInvitation, acceptState] = useAcceptAutoCareProviderInvitationMutation()
    const [token, setToken] = useState(() => searchParams.get('token')?.trim() ?? '')
    const [hasSubmitted, setHasSubmitted] = useState(false)
    const [acceptedResult, setAcceptedResult] = useState<AutoCareProviderInvitationAcceptResponse | null>(null)
    const copy = {
        back: t('autocare.ownerInvitationBack'),
        eyebrow: t('autocare.ownerInvitationEyebrow'),
        title: t('autocare.ownerInvitationTitle'),
        description: t('autocare.ownerInvitationDescription'),
        account: t('autocare.ownerInvitationAccount'),
        tokenLabel: t('autocare.ownerInvitationTokenLabel'),
        tokenPlaceholder: t('autocare.ownerInvitationTokenPlaceholder'),
        accept: t('autocare.ownerInvitationAccept'),
        accepting: t('autocare.ownerInvitationAccepting'),
        required: t('autocare.ownerInvitationRequired'),
        expired: t('autocare.ownerInvitationExpired'),
        wrongEmail: t('autocare.ownerInvitationWrongEmail'),
        invalid: t('autocare.ownerInvitationInvalid'),
        failed: t('autocare.ownerInvitationFailed'),
        acceptedTitle: t('autocare.ownerInvitationAcceptedTitle'),
        acceptedDescription: t('autocare.ownerInvitationAcceptedDescription'),
        role: t('autocare.ownerInvitationRole'),
        scope: t('autocare.ownerInvitationScope'),
        allBranches: t('autocare.ownerInvitationAllBranches'),
        assignedBranch: t('autocare.ownerInvitationAssignedBranch'),
        openWorkspace: t('autocare.ownerInvitationOpenWorkspace'),
        goToProfile: t('autocare.ownerInvitationGoToProfile'),
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setHasSubmitted(true)
        const normalizedToken = token.trim()
        if (!normalizedToken) return

        try {
            const result = await acceptInvitation({ token: normalizedToken }).unwrap()
            setAcceptedResult(result)
        } catch {
            // The mutation state exposes the translated API error below. Keeping
            // the token in the form lets the user retry without re-pasting it.
        }
    }

    const errorStatus = getErrorStatus(acceptState.error)
    const errorMessage = acceptState.error
        ? errorStatus === 409
            ? copy.expired
            : errorStatus === 403
                ? copy.wrongEmail
                : errorStatus === 404
                    ? copy.invalid
                    : getApiErrorMessage(acceptState.error, copy.failed)
        : hasSubmitted && !token.trim()
            ? copy.required
            : null

    if (acceptedResult) {
        const providerLink = routePaths.ownerAutoCareProviderDetails(acceptedResult.membership.providerId)

        return (
            <main className="min-h-full bg-background px-[var(--layout-gutter)] py-8 lg:py-12">
                <section className="mx-auto max-w-2xl">
                    <div className="rounded-[var(--radius-panel)] border border-status-success-border bg-card p-6 shadow-sm sm:p-8">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-status-success-surface text-status-success-foreground">
                            <CheckCircle2 aria-hidden="true" className="size-6" />
                        </div>
                        <p className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-primary">{copy.eyebrow}</p>
                        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{copy.acceptedTitle}</h1>
                        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{copy.acceptedDescription}</p>

                        <dl className="mt-7 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-border bg-muted/40 p-4">
                                <dt className="text-xs font-semibold text-muted-foreground">{copy.role}</dt>
                                <dd className="mt-1 text-sm font-bold text-foreground">{getRoleLabel(acceptedResult.membership.role, t)}</dd>
                            </div>
                            <div className="rounded-xl border border-border bg-muted/40 p-4">
                                <dt className="text-xs font-semibold text-muted-foreground">{copy.scope}</dt>
                                <dd className="mt-1 text-sm font-bold text-foreground">{acceptedResult.membership.locationId ? copy.assignedBranch : copy.allBranches}</dd>
                            </div>
                        </dl>

                        <div className="mt-7 flex flex-wrap gap-3">
                            <Link
                                to={providerLink}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {copy.openWorkspace}
                                <ArrowRight aria-hidden="true" className="size-4" />
                            </Link>
                            <Link
                                to={ROUTES.profile}
                                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {copy.goToProfile}
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
        )
    }

    return (
        <main className="min-h-full bg-background px-[var(--layout-gutter)] py-8 lg:py-12">
            <section className="mx-auto max-w-2xl">
                <Link to={ROUTES.profile} className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
                    {copy.back}
                </Link>

                <div className="mt-5 rounded-[var(--radius-panel)] border border-border bg-card p-6 shadow-sm sm:p-8">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <UsersRound aria-hidden="true" className="size-6" />
                    </div>
                    <p className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-primary">{copy.eyebrow}</p>
                    <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{copy.title}</h1>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{copy.description}</p>

                    <div className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-4">
                        <Mail aria-hidden="true" className="size-4 shrink-0 text-primary" />
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-muted-foreground">{copy.account}</p>
                            <p className="truncate text-sm font-bold text-foreground">{user?.email ?? t('common.notProvided')}</p>
                        </div>
                    </div>

                    <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
                        <div>
                            <label htmlFor="owner-invitation-token" className="text-sm font-bold text-foreground">{copy.tokenLabel}</label>
                            <input
                                id="owner-invitation-token"
                                name="token"
                                value={token}
                                onChange={(event) => setToken(event.target.value)}
                                placeholder={copy.tokenPlaceholder}
                                autoComplete="one-time-code"
                                disabled={acceptState.isLoading}
                                aria-invalid={Boolean(errorMessage) || undefined}
                                aria-describedby={errorMessage ? 'owner-invitation-error' : undefined}
                                className="mt-2 min-h-12 w-full rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                                data-testid="owner-invitation-token"
                            />
                        </div>

                        {errorMessage ? (
                            <p id="owner-invitation-error" role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                                {errorMessage}
                            </p>
                        ) : null}

                        <Button type="submit" className="min-h-11 w-full sm:w-auto" loading={acceptState.isLoading} data-testid="owner-invitation-submit">
                            {acceptState.isLoading ? copy.accepting : copy.accept}
                        </Button>
                    </form>

                    <div className="mt-6 flex items-start gap-3 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">
                        <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{t('autocare.ownerInvitationSecurityNote')}</span>
                    </div>
                </div>

                <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock3 aria-hidden="true" className="size-3.5" />
                    {t('autocare.ownerInvitationInactiveHint')}
                </p>
            </section>
        </main>
    )
}
