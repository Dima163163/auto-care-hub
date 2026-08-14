import { useState } from 'react'
import { CarFront, Plus, Truck } from 'lucide-react'

import { useCreateAutoCareFleetMutation, useCreateAutoCareFleetVehicleMutation, useGetMyAutoCareFleetsQuery } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'

export function OwnerFleetPanel() {
    const { locale } = useTranslation()
    const { data: fleets = [] } = useGetMyAutoCareFleetsQuery()
    const [createFleet, fleetState] = useCreateAutoCareFleetMutation()
    const [createVehicle] = useCreateAutoCareFleetVehicleMutation()
    const [name, setName] = useState('')
    const copy = locale === 'ru' ? { title: 'Автопарки и партнёры', text: 'Храните автомобили компаний, чтобы согласовывать заявки и обслуживать несколько машин одним процессом.', placeholder: 'Название автопарка', add: 'Добавить автопарк', vehicle: 'Добавить автомобиль' } : { title: 'Fleet and partner vehicles', text: 'Keep company vehicles together for approvals and repeat service workflows.', placeholder: 'Fleet name', add: 'Add fleet', vehicle: 'Add vehicle' }
    const submit = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!name.trim()) return; await createFleet({ name: name.trim() }).unwrap(); setName('') }
    const addVehicle = async (fleetId: string) => { await createVehicle({ fleetId, label: 'Новый автомобиль', vehicleSnapshot: { make: 'Не указана', model: 'Не указана', year: new Date().getFullYear() } }).unwrap() }
    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div className="flex items-start gap-3"><span className="flex size-10 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><Truck className="size-5" /></span><div><h2 className="text-lg font-black text-foreground">{copy.title}</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">{copy.text}</p></div></div><form className="mt-4 flex flex-wrap gap-2" onSubmit={(event) => void submit(event)}><input value={name} onChange={(event) => setName(event.target.value)} placeholder={copy.placeholder} className="h-9 min-w-52 flex-1 rounded-[var(--radius-control)] border border-border bg-background px-3 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /><button type="submit" disabled={fleetState.isLoading} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground"><Plus className="size-3.5" />{copy.add}</button></form>{fleets.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{fleets.map((fleet) => <div key={fleet.id} className="rounded-[var(--radius-card)] border border-border bg-background p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-black text-foreground">{fleet.name}</p><span className="text-xs font-bold text-muted-foreground">{fleet.vehicles.length}</span></div><div className="mt-2 space-y-1">{fleet.vehicles.slice(0, 2).map((vehicle) => <p key={vehicle.id} className="flex items-center gap-1.5 text-xs text-muted-foreground"><CarFront className="size-3.5 text-primary" />{vehicle.label}</p>)}</div><button type="button" onClick={() => void addVehicle(fleet.id)} className="mt-3 text-xs font-black text-primary">{copy.vehicle}</button></div>)}</div> : null}</section>
}
