import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { toast } from 'sonner'

import {
    getVehicleBrandLabel,
    useCreateAutoCareFleetVehicleMutation,
    useGetVehicleCatalogQuery,
    vehicleCatalog,
} from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'

type Props = {
    fleetId: string
    locale: string
    onCancel: () => void
    onCreated: () => void
}

export function OwnerFleetVehicleForm({ fleetId, locale, onCancel, onCreated }: Props) {
    const catalogQuery = useGetVehicleCatalogQuery()
    const [createVehicle, createState] = useCreateAutoCareFleetVehicleMutation()
    const [brandId, setBrandId] = useState('')
    const [modelId, setModelId] = useState('')
    const copy = getCopy(locale)
    const brands = catalogQuery.data ?? vehicleCatalog
    const selectedBrand = useMemo(() => brands.find((brand) => brand.id === brandId), [brandId, brands])
    const selectedModel = useMemo(() => selectedBrand?.models.find((model) => model.id === modelId), [modelId, selectedBrand])

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!selectedBrand) return

        const make = getVehicleBrandLabel(selectedBrand, locale)
        const model = selectedModel?.label ?? null
        try {
            await createVehicle({
                fleetId,
                label: [make, model].filter(Boolean).join(' '),
                vehicleSnapshot: {
                    brandId: selectedBrand.id,
                    make,
                    modelId: selectedModel?.id ?? null,
                    model,
                    year: selectedModel?.yearsTo ?? null,
                },
            }).unwrap()
            toast.success(copy.success)
            onCreated()
        } catch (error) {
            toast.error(getApiErrorMessage(error, copy.error))
        }
    }

    return <form className="mt-3 grid gap-2 rounded-[var(--radius-control)] border border-primary/25 bg-muted/35 p-3" onSubmit={(event) => void submit(event)}>
        <p className="text-xs font-black text-foreground">{copy.title}</p>
        <SelectField label={copy.make} value={brandId} onChange={(value) => { setBrandId(value); setModelId('') }} options={brands.map((brand) => [brand.id, getVehicleBrandLabel(brand, locale)] as const)} placeholder={copy.selectMake} />
        <SelectField label={copy.model} value={modelId} onChange={setModelId} options={selectedBrand?.models.map((model) => [model.id, model.label] as const) ?? []} placeholder={copy.selectModel} disabled={!selectedBrand} />
        <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button type="button" onClick={onCancel} className="h-8 rounded-[var(--radius-control)] px-2.5 text-xs font-bold text-muted-foreground hover:bg-background">{copy.cancel}</button>
            <button type="submit" disabled={!selectedBrand || createState.isLoading} className="h-8 rounded-[var(--radius-control)] bg-primary px-2.5 text-xs font-black text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60">{copy.save}</button>
        </div>
    </form>
}

function SelectField({ label, value, onChange, options, placeholder, disabled = false }: {
    label: string
    value: string
    onChange: (value: string) => void
    options: readonly (readonly [string, string])[]
    placeholder: string
    disabled?: boolean
}) {
    return <label className="relative grid gap-1 text-xs font-bold text-foreground"><span>{label}</span><select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="select-with-icon h-8 appearance-none rounded-[var(--radius-control)] border border-border bg-background px-2.5 pr-8 text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50"><option value="">{placeholder}</option>{options.map(([option, optionLabel]) => <option key={option} value={option}>{optionLabel}</option>)}</select><ChevronDown className="pointer-events-none absolute bottom-2.5 right-2.5 size-3.5 text-muted-foreground" aria-hidden="true" /></label>
}

function getCopy(locale: string) {
    return locale === 'ru'
        ? { title: 'Добавить автомобиль', make: 'Марка автомобиля', model: 'Модель', selectMake: 'Выберите марку', selectModel: 'Выберите модель', save: 'Добавить', cancel: 'Отмена', success: 'Автомобиль добавлен', error: 'Не удалось добавить автомобиль' }
        : { title: 'Add vehicle', make: 'Vehicle make', model: 'Model', selectMake: 'Select make', selectModel: 'Select model', save: 'Add vehicle', cancel: 'Cancel', success: 'Vehicle added', error: 'Could not add vehicle' }
}
