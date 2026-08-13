import { useMemo, useState } from 'react'
import { CarFront, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { automotiveVehicleBrands, getVehicleBrandLabel, getVehicleModels, useGetVehicleCatalogQuery } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import {
    getVehicleImage,
    vehicleFuelTypes,
    useCreateMyVehicleMutation,
    useDeleteMyVehicleMutation,
    useGetMyVehiclesQuery,
    useUpdateMyVehicleMutation,
    type ClientVehicle,
    type CreateClientVehicleInput,
    type VehicleFuelType,
} from '@/entities/user'

const emptyForm: CreateClientVehicleInput = { brandId: '', model: '', year: new Date().getFullYear(), fuelType: 'petrol', engineDisplacement: null, horsepower: null, color: 'black', vin: null }

export function ClientVehiclesSection() {
    const { t, locale } = useTranslation()
    const { data: vehicleCatalog } = useGetVehicleCatalogQuery()
    const { data: vehicles = [], isLoading } = useGetMyVehiclesQuery()
    const [createVehicle, createState] = useCreateMyVehicleMutation()
    const [updateVehicle, updateState] = useUpdateMyVehicleMutation()
    const [deleteVehicle] = useDeleteMyVehicleMutation()
    const [form, setForm] = useState<CreateClientVehicleInput>(emptyForm)
    const [editingId, setEditingId] = useState<string | null>(null)
    const brands = vehicleCatalog ?? automotiveVehicleBrands
    const models = useMemo(() => vehicleCatalog?.find((brand) => brand.id === form.brandId)?.models.map((model) => model.label) ?? getVehicleModels(form.brandId), [form.brandId, vehicleCatalog])
    const isSaving = createState.isLoading || updateState.isLoading
    const update = <K extends keyof CreateClientVehicleInput>(key: K, value: CreateClientVehicleInput[K]) => setForm((current) => ({ ...current, [key]: value }))

    const reset = () => { setEditingId(null); setForm(emptyForm) }
    const edit = (vehicle: ClientVehicle) => { setEditingId(vehicle.id); setForm({ brandId: vehicle.brandId, model: vehicle.model, year: vehicle.year, fuelType: vehicle.fuelType, engineDisplacement: vehicle.engineDisplacement, horsepower: vehicle.horsepower, color: vehicle.color, vin: vehicle.vin }) }
    const save = async () => {
        if (!form.brandId || !form.model) return
        try {
            if (editingId) await updateVehicle({ id: editingId, patch: form }).unwrap()
            else await createVehicle(form).unwrap()
            toast.success(t('profile.vehicles.saved'))
            reset()
        } catch (error) { toast.error(getApiErrorMessage(error, t('profile.vehicles.saveError'))) }
    }
    const remove = async (id: string) => { try { await deleteVehicle(id).unwrap(); toast.success(t('profile.vehicles.deleted')) } catch (error) { toast.error(getApiErrorMessage(error, t('profile.vehicles.saveError'))) } }

    return <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10"><CarFront className="size-5 text-primary" /></span><h2 className="text-xl font-semibold tracking-tight">{t('profile.vehicles.title')}</h2></div><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t('profile.vehicles.description')}</p></div><Button type="button" variant="outline" onClick={reset}><Plus className="size-4" />{t('profile.vehicles.add')}</Button></div>
        {vehicles.length > 0 && <div className="mt-5 grid gap-3 lg:grid-cols-2">{vehicles.map((vehicle) => { const brand = brands.find((item) => item.id === vehicle.brandId) ?? brands[0]!; return <article key={vehicle.id} className="flex gap-4 rounded-xl border bg-muted/20 p-3"><img src={vehicle.imageUrl || getVehicleImage(vehicle.brandId, vehicle.model)} alt={`${getVehicleBrandLabel(brand, locale)} ${vehicle.model}`} className="h-24 w-32 rounded-lg object-cover" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h3 className="font-bold">{getVehicleBrandLabel(brand, locale)} {vehicle.model}</h3><p className="text-xs text-muted-foreground">{vehicle.year} · {t(`profile.vehicles.fuel.${vehicle.fuelType}` as 'profile.vehicles.fuel.petrol')} · {t(`profile.vehicles.colors.${vehicle.color}` as 'profile.vehicles.colors.black')}</p></div>{vehicle.isPrimary && <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">{t('profile.vehicles.primary')}</span>}</div><p className="mt-2 text-xs text-muted-foreground">{vehicle.engineDisplacement ? `${vehicle.engineDisplacement} л` : '—'} · {vehicle.horsepower ? `${vehicle.horsepower} л.с.` : '—'}{vehicle.vin ? ` · VIN ${vehicle.vin}` : ''}</p><div className="mt-2 flex gap-2"><button type="button" onClick={() => edit(vehicle)} className="inline-flex items-center gap-1 text-xs font-bold text-primary"><Pencil className="size-3.5" />{t('common.edit')}</button><button type="button" onClick={() => void remove(vehicle.id)} className="inline-flex items-center gap-1 text-xs font-bold text-status-danger-foreground"><Trash2 className="size-3.5" />{t('common.delete')}</button></div></div></article> })}</div>}
        {vehicles.length === 0 && !isLoading && <p className="mt-5 rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">{t('profile.vehicles.empty')}</p>}
        <div className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-2 lg:grid-cols-4"><VehicleSelect label={t('profile.vehicles.brand')} value={form.brandId} onChange={(value) => { update('brandId', value); update('model', '') }} options={brands.map((brand) => [brand.id, getVehicleBrandLabel(brand, locale)] as const)} /><VehicleSelect label={t('profile.vehicles.model')} value={form.model} onChange={(value) => update('model', value)} options={models.map((model) => [model, model] as const)} disabled={!form.brandId} /><VehicleSelect label={t('profile.vehicles.fuelLabel')} value={form.fuelType} onChange={(value) => update('fuelType', value as VehicleFuelType)} options={vehicleFuelTypes.map((fuel) => [fuel, t(`profile.vehicles.fuel.${fuel}` as 'profile.vehicles.fuel.petrol')] as const)} /><VehicleSelect label={t('profile.vehicles.year')} value={String(form.year)} onChange={(value) => update('year', Number(value))} options={Array.from({ length: 30 }, (_, index) => { const year = new Date().getFullYear() - index; return [String(year), String(year)] as const })} /><VehicleSelect label={t('profile.vehicles.color')} value={form.color} onChange={(value) => update('color', value)} options={['black', 'white', 'silver', 'gray', 'blue', 'red', 'green', 'other'].map((color) => [color, t(`profile.vehicles.colors.${color}` as 'profile.vehicles.colors.black')] as const)} /><NumberInput label={t('profile.vehicles.engine')} value={form.engineDisplacement} step="0.1" placeholder="2.0" onChange={(value) => update('engineDisplacement', value)} /><NumberInput label={t('profile.vehicles.power')} value={form.horsepower} step="1" placeholder="150" onChange={(value) => update('horsepower', value)} /><label className="grid gap-1.5 text-xs font-bold sm:col-span-2"><span>{t('profile.vehicles.vin')}</span><input value={form.vin ?? ''} maxLength={17} onChange={(event) => update('vin', event.target.value.toUpperCase() || null)} placeholder={t('profile.vehicles.vinPlaceholder')} className="h-10 rounded-lg border bg-background px-3 text-sm font-medium uppercase outline-none focus:border-primary" /></label></div>
        <div className="mt-4 flex flex-wrap justify-end gap-2"><Button type="button" variant="ghost" onClick={reset}>{t('common.cancel')}</Button><Button type="button" loading={isSaving} onClick={() => void save()} disabled={!form.brandId || !form.model}>{editingId ? t('common.save') : t('profile.vehicles.add')}</Button></div>
    </section>
}

function VehicleSelect({ label, value, onChange, options, disabled = false }: { label: string; value: string; onChange: (value: string) => void; options: readonly (readonly [string, string])[]; disabled?: boolean }) { return <label className="relative grid gap-1.5 text-xs font-bold"><span>{label}</span><select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="select-with-icon h-10 appearance-none rounded-lg border bg-background px-3 pr-9 text-sm font-medium outline-none focus:border-primary disabled:opacity-50"><option value="">—</option>{options.map(([option, optionLabel]) => <option key={option} value={option}>{optionLabel}</option>)}</select><ChevronDown className="pointer-events-none absolute bottom-3 right-3 size-3.5 text-muted-foreground" aria-hidden="true" /></label> }
function NumberInput({ label, value, step, placeholder, onChange }: { label: string; value: number | null; step: string; placeholder: string; onChange: (value: number | null) => void }) { return <label className="grid gap-1.5 text-xs font-bold"><span>{label}</span><input type="number" min="0" step={step} value={value ?? ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)} className="h-10 rounded-lg border bg-background px-3 text-sm font-medium outline-none focus:border-primary" /></label> }
