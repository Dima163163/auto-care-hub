import type { FormEvent } from 'react'
import { useState } from 'react'
import { CarFront, Plus, Truck } from 'lucide-react'

import type { AutoCareFleetVehicle } from '@/entities/automotive-service'
import {
    useCreateAutoCareFleetMutation,
    useGetMyAutoCareFleetsQuery,
} from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'

import { OwnerFleetVehicleForm } from './OwnerFleetVehicleForm'

export function OwnerFleetPanel() {
    const { locale } = useTranslation()
    const { data: fleets = [] } = useGetMyAutoCareFleetsQuery()
    const [createFleet, fleetState] = useCreateAutoCareFleetMutation()
    const [name, setName] = useState('')
    const [activeFleetId, setActiveFleetId] = useState<string | null>(null)
    const copy = getCopy(locale)

    async function submitFleet(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!name.trim()) return

        await createFleet({ name: name.trim() }).unwrap()
        setName('')
    }

    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><Truck className="size-5" /></span>
            <div><h2 className="text-lg font-black text-foreground">{copy.title}</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">{copy.text}</p></div>
        </div>
        <form className="mt-4 flex flex-wrap gap-2" onSubmit={(event) => void submitFleet(event)}>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder={copy.placeholder} className="h-9 min-w-52 flex-1 rounded-[var(--radius-control)] border border-border bg-background px-3 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/40" />
            <button type="submit" disabled={fleetState.isLoading} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"><Plus className="size-3.5" />{copy.add}</button>
        </form>
        {fleets.length ? <div className="mt-4 space-y-2">{fleets.map((fleet) => <article key={fleet.id} className="rounded-[var(--radius-card)] border border-border bg-background p-3">
            <div className="flex items-center justify-between gap-2"><p className="text-sm font-black text-foreground">{fleet.name}</p><span className="text-xs font-bold text-muted-foreground">{fleet.vehicles.length}</span></div>
            {fleet.vehicles.length ? <FleetVehicleTable locale={locale} vehicles={fleet.vehicles} /> : null}
            {activeFleetId === fleet.id
                ? <OwnerFleetVehicleForm fleetId={fleet.id} locale={locale} onCancel={() => setActiveFleetId(null)} onCreated={() => setActiveFleetId(null)} />
                : <button type="button" onClick={() => setActiveFleetId(fleet.id)} className="mt-3 text-xs font-black text-primary">{copy.vehicle}</button>}
        </article>)}</div> : null}
    </section>
}

function FleetVehicleTable({ locale, vehicles }: { locale: string; vehicles: readonly AutoCareFleetVehicle[] }) {
    const copy = locale === 'ru'
        ? { vehicle: 'Автомобиль', registrationNumber: 'Госномер', internalReference: 'Внутренний №', vin: 'VIN', year: 'Год' }
        : { vehicle: 'Vehicle', registrationNumber: 'Registration', internalReference: 'Internal #', vin: 'VIN', year: 'Year' }

    return <div className="mt-3 overflow-x-auto rounded-[var(--radius-control)] border border-border">
        <table className="hidden min-w-[680px] w-full border-collapse text-left text-xs md:table">
            <thead className="bg-muted/55 text-[10px] font-black uppercase tracking-wide text-muted-foreground"><tr><th scope="col" className="px-2.5 py-2">{copy.vehicle}</th><th scope="col" className="px-2.5 py-2">{copy.registrationNumber}</th><th scope="col" className="px-2.5 py-2">{copy.internalReference}</th><th scope="col" className="px-2.5 py-2">{copy.vin}</th><th scope="col" className="px-2.5 py-2">{copy.year}</th></tr></thead>
            <tbody className="divide-y divide-border">{vehicles.map((vehicle) => <tr key={vehicle.id} className="bg-background"><th scope="row" className="whitespace-nowrap px-2.5 py-2 text-xs font-bold text-foreground"><span className="inline-flex items-center gap-1.5"><CarFront className="size-3.5 text-primary" />{vehicle.label}</span></th><td className="px-2.5 py-2 text-muted-foreground">{readSnapshotValue(vehicle.vehicleSnapshot, 'registrationNumber')}</td><td className="px-2.5 py-2 text-muted-foreground">{readSnapshotValue(vehicle.vehicleSnapshot, 'internalReference')}</td><td className="px-2.5 py-2 font-mono text-[11px] text-muted-foreground">{readSnapshotValue(vehicle.vehicleSnapshot, 'vin')}</td><td className="px-2.5 py-2 text-muted-foreground">{readSnapshotValue(vehicle.vehicleSnapshot, 'year')}</td></tr>)}</tbody>
        </table>
        <table className="w-full border-collapse text-left text-xs md:hidden">{vehicles.map((vehicle) => <tbody key={vehicle.id} className="[&:not(:first-child)]:border-t [&:not(:first-child)]:border-border"><tr className="bg-muted/55"><th scope="row" colSpan={2} className="px-2.5 py-2 text-xs font-bold text-foreground"><span className="inline-flex items-center gap-1.5"><CarFront className="size-3.5 text-primary" />{vehicle.label}</span></th></tr><MobileVehicleField label={copy.registrationNumber} value={readSnapshotValue(vehicle.vehicleSnapshot, 'registrationNumber')} /><MobileVehicleField label={copy.internalReference} value={readSnapshotValue(vehicle.vehicleSnapshot, 'internalReference')} /><MobileVehicleField label={copy.vin} value={readSnapshotValue(vehicle.vehicleSnapshot, 'vin')} mono /><MobileVehicleField label={copy.year} value={readSnapshotValue(vehicle.vehicleSnapshot, 'year')} /></tbody>)}</table>
    </div>
}

function MobileVehicleField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
    return <tr><th scope="row" className="w-1/2 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-muted-foreground">{label}</th><td className={`px-2.5 py-1.5 text-right text-muted-foreground ${mono ? 'font-mono text-[11px]' : ''}`}>{value}</td></tr>
}

function readSnapshotValue(snapshot: Record<string, unknown>, key: string) {
    const value = snapshot[key]
    if (typeof value === 'number') return String(value)
    return typeof value === 'string' && value.trim() ? value.trim() : '—'
}

function getCopy(locale: string) {
    return locale === 'ru'
        ? { title: 'Автопарки и партнёры', text: 'Храните автомобили компаний, чтобы согласовывать заявки и обслуживать несколько машин одним процессом.', placeholder: 'Название автопарка', add: 'Добавить автопарк', vehicle: 'Добавить автомобиль' }
        : { title: 'Fleet and partner vehicles', text: 'Keep company vehicles together for approvals and repeat service workflows.', placeholder: 'Fleet name', add: 'Add fleet', vehicle: 'Add vehicle' }
}
