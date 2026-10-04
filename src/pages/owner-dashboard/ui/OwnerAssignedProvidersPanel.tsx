import { ArrowRight, MapPin, UsersRound } from 'lucide-react'
import { Link } from 'react-router'
import { useGetAutoCareProviderProfileQuery } from '@/entities/automotive-service'
import type { AutoCareOwnerWorkspaceAccess, AutoCareServiceRequest } from '@/entities/automotive-service'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

type Scope = AutoCareOwnerWorkspaceAccess['scopes'][number]
type Props = { scopes: Scope[]; requests: AutoCareServiceRequest[] }
export function OwnerAssignedProvidersPanel({ scopes, requests }: Props) {
    const { t } = useTranslation()
    if (!scopes.length) return null
    return <section className="rounded-[var(--radius-panel)] border bg-card p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><UsersRound className="size-5 text-primary" />{t('autocare.assignedProvidersTitle')}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('autocare.assignedProvidersDescription')}</p>
        <div className="mt-4 space-y-3">{scopes.map((scope) => <AssignedProvider key={scope.providerId} scope={scope} requests={requests.filter((request) => request.providerId === scope.providerId && (scope.locationIds === null || scope.locationIds.includes(request.locationId)))} />)}</div>
    </section>
}
function AssignedProvider({ scope, requests }: { scope: Scope; requests: AutoCareServiceRequest[] }) {
    const { t } = useTranslation()
    const publicProfile = useGetAutoCareProviderProfileQuery(scope.providerId, { skip: requests.length > 0 })
    const publicData = publicProfile.isError ? undefined : publicProfile.data
    const name = requests[0]?.providerName ?? publicData?.name ?? t('autocare.assignedProviderFallback')
    const publishedLocations = publicData ? (publicData.locations?.length ? publicData.locations.map((item) => item.location) : [publicData.location]) : []
    const addresses = [...new Set([
        ...requests.map((request) => request.address),
        ...publishedLocations.filter((location) => scope.locationIds === null || scope.locationIds.includes(location.id)).map((location) => location.address),
    ].filter(Boolean))]
    const roleLabels = { owner: t('user.owner'), manager: t('autocare.ownerInvitationRoleManager'), staff: t('autocare.ownerInvitationRoleStaff') }
    const requestPath = `${ROUTES.ownerAutoCareRequests}?${new URLSearchParams({ provider: scope.providerId })}`
    return <article className="rounded-lg border bg-background p-4">
        <h3 className="font-semibold">{name}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{t('autocare.assignedWorkspaceRoles')}: {scope.roles.map((role) => roleLabels[role]).join(', ')}</p>
        {scope.locationIds === null && <p className="mt-1 text-sm text-muted-foreground">{t('autocare.allProviderBranches')}</p>}
        {addresses.map((address) => <p key={address} className="mt-2 flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" />{address}</p>)}
        {!addresses.length && <p className="mt-2 text-sm text-muted-foreground">{t(publicProfile.isLoading ? 'common.loading' : 'autocare.assignedBranchUnavailable')}</p>}
        <Link to={requestPath} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-medium text-primary">{t('autocare.ownerDashboardHeroRequests')}<ArrowRight className="size-4" /></Link>
    </article>
}
