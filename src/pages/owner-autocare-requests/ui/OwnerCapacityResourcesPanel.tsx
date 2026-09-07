import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import { useCreateOwnerAutoCareCapacityResourceMutation, useGetOwnerAutoCareCapacityReservationsQuery, useGetOwnerAutoCareCapacityResourcesQuery, useUpdateOwnerAutoCareCapacityResourceMutation } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'

const RESOURCE_TYPES = ['specialist', 'bay', 'lift', 'equipment'] as const

const resourceTypeKeys = {
    specialist: 'autocare.ownerCapacityResourcesTypeSpecialists',
    bay: 'autocare.ownerCapacityResourcesTypeBays',
    lift: 'autocare.ownerCapacityResourcesTypeLifts',
    equipment: 'autocare.ownerCapacityResourcesTypeEquipment',
} as const

interface OwnerCapacityResourcesPanelProps {
    providerId: string
    locationId: string
    selectedDay: Date
}

/**
 * Detailed resource management is intentionally kept out of the compact MVP
 * calendar. The panel remains available for the post-MVP capacity workspace.
 */
export function OwnerCapacityResourcesPanel({ providerId, locationId, selectedDay }: OwnerCapacityResourcesPanelProps) {
    const { t } = useTranslation()
    const [resourceType, setResourceType] = useState<'specialist' | 'bay' | 'lift' | 'equipment'>('specialist')
    const [resourceName, setResourceName] = useState('')
    const [resourceCapacity, setResourceCapacity] = useState('1')
    const [actionError, setActionError] = useState<string | null>(null)
    const range = useMemo(() => {
        const from = new Date(selectedDay)
        from.setHours(0, 0, 0, 0)
        const to = new Date(from)
        to.setDate(to.getDate() + 1)
        return { from: from.toISOString(), to: to.toISOString() }
    }, [selectedDay])
    const resources = useGetOwnerAutoCareCapacityResourcesQuery({ providerId, locationId })
    const reservations = useGetOwnerAutoCareCapacityReservationsQuery({ providerId, locationId, ...range })
    const [createResource, createState] = useCreateOwnerAutoCareCapacityResourceMutation()
    const [updateResource, updateState] = useUpdateOwnerAutoCareCapacityResourceMutation()
    const resourceList = resources.data ?? []

    const addResource = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const name = resourceName.trim()
        const capacity = Number(resourceCapacity)
        if (!name || !Number.isInteger(capacity) || capacity < 1 || capacity > 100) return
        setActionError(null)
        try {
            await createResource({ providerId, locationId, type: resourceType, name, capacity, active: true, metadata: {} }).unwrap()
            setResourceName('')
            setResourceCapacity('1')
        } catch (error) {
            setActionError(getApiErrorMessage(error, t('autocare.ownerCapacityResourcesCreateError')))
        }
    }

    const toggleResource = async (resource: (typeof resourceList)[number]) => {
        setActionError(null)
        try {
            await updateResource({ providerId, resourceId: resource.id, active: !resource.active }).unwrap()
        } catch (error) {
            setActionError(getApiErrorMessage(error, t('autocare.ownerCapacityResourcesUpdateError')))
        }
    }

    return <section data-testid="owner-capacity-resources" className="rounded-[var(--radius-control)] border border-border bg-background p-3"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">{t('autocare.ownerCapacityResourcesTitle')}</p><span className="text-[10px] text-muted-foreground">{resourceList.filter((resource) => resource.active).length} {t('autocare.ownerCapacityResourcesActive')}</span></div>{resources.isError ? <p role="alert" className="mt-2 text-[10px] font-semibold text-destructive">{t('autocare.ownerCapacityResourcesLoadError')}</p> : null}{reservations.isError ? <p role="alert" className="mt-2 text-[10px] font-semibold text-destructive">{t('autocare.ownerCapacityResourcesOccupancyError')}</p> : null}{resources.isLoading ? <div className="mt-3 h-16 animate-pulse rounded-[var(--radius-control)] bg-secondary" aria-label={t('autocare.ownerCapacityResourcesLoading')} /> : resourceList.length > 0 ? <><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{RESOURCE_TYPES.map((type) => { const activeResources = resourceList.filter((resource) => resource.type === type && resource.active); const occupied = reservations.data?.filter((reservation) => activeResources.some((resource) => resource.id === reservation.resourceId)).length ?? 0; return <div key={type} className="rounded-[var(--radius-control)] bg-secondary px-2.5 py-2"><p className="text-[10px] font-bold uppercase text-muted-foreground">{t(resourceTypeKeys[type])}</p><p className="mt-1 text-sm font-black text-foreground">{occupied} / {activeResources.reduce((total, resource) => total + resource.capacity, 0)}</p></div> })}</div><div className="mt-3 grid gap-1.5 sm:grid-cols-2">{resourceList.map((resource) => <button key={resource.id} type="button" onClick={() => void toggleResource(resource)} disabled={updateState.isLoading} className="flex items-center justify-between gap-2 rounded-[var(--radius-control)] border border-border px-2.5 py-2 text-left text-[11px] hover:border-primary disabled:opacity-60"><span className="truncate text-foreground">{resource.name} · {resource.capacity}</span><span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${resource.active ? 'bg-status-success-surface text-status-success-foreground' : 'bg-secondary text-muted-foreground'}`}>{resource.active ? t('autocare.ownerCapacityResourcesStatusActive') : t('autocare.ownerCapacityResourcesStatusInactive')}</span></button>)}</div></> : <p className="mt-3 rounded-[var(--radius-control)] bg-secondary/60 px-3 py-2 text-[10px] text-muted-foreground">{t('autocare.ownerCapacityResourcesEmpty')}</p>}{reservations.isFetching && !reservations.isLoading ? <p className="mt-2 text-[10px] text-muted-foreground">{t('autocare.ownerCapacityResourcesRefreshing')}</p> : null}<form onSubmit={(event) => void addResource(event)} className="mt-3 grid gap-2 sm:grid-cols-[1fr_130px_72px_auto]"><input aria-label={t('autocare.ownerCapacityResourcesResourceName')} value={resourceName} onChange={(event) => { setActionError(null); setResourceName(event.target.value) }} placeholder={t('autocare.ownerCapacityResourcesResourceNamePlaceholder')} className="h-8 min-w-0 rounded-[var(--radius-control)] border border-border bg-card px-2 text-xs text-foreground" /><select aria-label={t('autocare.ownerCapacityResourcesResourceType')} value={resourceType} onChange={(event) => { setActionError(null); setResourceType(event.target.value as typeof resourceType) }} className="h-8 rounded-[var(--radius-control)] border border-border bg-card px-2 text-xs text-foreground">{RESOURCE_TYPES.map((type) => <option key={type} value={type}>{t(resourceTypeKeys[type])}</option>)}</select><input aria-label={t('autocare.ownerCapacityResourcesResourceCapacity')} type="number" min="1" max="100" value={resourceCapacity} onChange={(event) => { setActionError(null); setResourceCapacity(event.target.value) }} className="h-8 rounded-[var(--radius-control)] border border-border bg-card px-2 text-xs text-foreground" /><button type="submit" disabled={createState.isLoading || resources.isError} className="h-8 rounded-[var(--radius-control)] bg-primary px-3 text-[11px] font-black text-primary-foreground disabled:opacity-60">{createState.isLoading ? t('autocare.ownerCapacityResourcesAdding') : t('autocare.ownerCapacityResourcesAdd')}</button></form>{actionError ? <p role="alert" className="mt-2 text-[10px] font-semibold text-destructive">{actionError}</p> : null}{createState.error && !actionError ? <p role="alert" className="mt-2 text-[10px] font-semibold text-destructive">{t('autocare.ownerCapacityResourcesCreateError')}</p> : null}</section>
}
