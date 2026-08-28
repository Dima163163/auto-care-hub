import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { toast } from 'sonner'

import {
    getVehicleBrandLabel,
    useCreateAutoCareFleetVehicleMutation,
    useGetVehicleCatalogQuery,
    vehicleCatalog,
} from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { readFormDraft } from '@/shared/lib/form-draft'
import { useFormDraft } from '@/shared/lib/useFormDraft'
import { FormDraftNotice } from '@/shared/ui/form-draft-notice/FormDraftNotice'

type Props = {
    fleetId: string
    locale: string
    onCancel: () => void
    onCreated: () => void
}

type FleetVehicleDraft = {
    brandId: string
    modelId: string
    year: string
}

const EMPTY_DRAFT: FleetVehicleDraft = {
    brandId: '',
    modelId: '',
    year: '',
}

export function OwnerFleetVehicleForm({ fleetId, locale, onCancel, onCreated }: Props) {
    const catalogQuery = useGetVehicleCatalogQuery()
    const [createVehicle, createState] = useCreateAutoCareFleetVehicleMutation()
    const storageKey = `autocare-owner-fleet-vehicle:${fleetId}`
    const [brandId, setBrandId] = useState('')
    const [modelId, setModelId] = useState('')
    const [year, setYear] = useState('')
    const [registrationNumber, setRegistrationNumber] = useState('')
    const [internalReference, setInternalReference] = useState('')
    const [vin, setVin] = useState('')
    const [isDraftRestored, setIsDraftRestored] = useState(false)
    const copy = getCopy(locale)
    const brands = catalogQuery.data ?? vehicleCatalog
    const selectedBrand = useMemo(() => brands.find((brand) => brand.id === brandId), [brandId, brands])
    const selectedModel = useMemo(() => selectedBrand?.models.find((model) => model.id === modelId), [modelId, selectedBrand])
    const years = useMemo(() => getSelectableYears(selectedModel?.yearsFrom, selectedModel?.yearsTo), [selectedModel])
    const draftValues = useMemo<FleetVehicleDraft>(() => ({
        brandId,
        modelId,
        year,
    }), [brandId, modelId, year])
    const hasDraftableValues = Boolean(brandId || modelId || year)
    const { clearDraft } = useFormDraft({
        storageKey,
        values: draftValues,
        enabled: hasDraftableValues,
        parse: parseFleetVehicleDraft,
    })

    useEffect(() => {
        const frameId = window.requestAnimationFrame(() => {
            const draft = readFormDraft(storageKey, parseFleetVehicleDraft)

            if (!draft) return

            setBrandId(draft.brandId)
            setModelId(draft.modelId)
            setYear(draft.year)
            setIsDraftRestored(true)
        })

        return () => window.cancelAnimationFrame(frameId)
    }, [storageKey])

    const discardDraft = () => {
        clearDraft()
        setBrandId(EMPTY_DRAFT.brandId)
        setModelId(EMPTY_DRAFT.modelId)
        setYear(EMPTY_DRAFT.year)
        setRegistrationNumber('')
        setInternalReference('')
        setVin('')
        setIsDraftRestored(false)
    }

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
                    year: year ? Number(year) : null,
                    registrationNumber: registrationNumber.trim() || null,
                    internalReference: internalReference.trim() || null,
                    vin: vin.trim() || null,
                },
            }).unwrap()
            clearDraft()
            toast.success(copy.success)
            onCreated()
        } catch (error) {
            toast.error(getApiErrorMessage(error, copy.error))
        }
    }

    return <form className="mt-3 grid gap-2 rounded-[var(--radius-control)] border border-primary/25 bg-muted/35 p-3" onSubmit={(event) => void submit(event)}>
        <p className="text-xs font-black text-foreground">{copy.title}</p>
        {isDraftRestored ? <FormDraftNotice onDiscard={discardDraft} /> : null}
        <SelectField label={copy.make} value={brandId} onChange={(value) => { setBrandId(value); setModelId(''); setYear('') }} options={brands.map((brand) => [brand.id, getVehicleBrandLabel(brand, locale)] as const)} placeholder={copy.selectMake} />
        <SelectField label={copy.model} value={modelId} onChange={(value) => { setModelId(value); setYear('') }} options={selectedBrand?.models.map((model) => [model.id, model.label] as const) ?? []} placeholder={copy.selectModel} disabled={!selectedBrand} />
        <SelectField label={copy.year} value={year} onChange={setYear} options={years.map((entry) => [String(entry), String(entry)] as const)} placeholder={copy.selectYear} />
        <TextField label={copy.registrationNumber} value={registrationNumber} maxLength={32} onChange={setRegistrationNumber} />
        <TextField label={copy.internalReference} value={internalReference} maxLength={40} onChange={setInternalReference} />
        <TextField label={copy.vin} value={vin} maxLength={17} onChange={setVin} />
        <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button type="button" onClick={() => { discardDraft(); onCancel() }} className="h-8 rounded-[var(--radius-control)] px-2.5 text-xs font-bold text-muted-foreground hover:bg-background">{copy.cancel}</button>
            <button type="submit" disabled={!selectedBrand || !year || createState.isLoading} className="h-8 rounded-[var(--radius-control)] bg-primary px-2.5 text-xs font-black text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60">{copy.save}</button>
        </div>
    </form>
}

function parseFleetVehicleDraft(value: unknown): FleetVehicleDraft | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null

    const source = value as Record<string, unknown>
    const read = (key: keyof FleetVehicleDraft) => typeof source[key] === 'string' ? source[key] : ''

    return {
        brandId: read('brandId'),
        modelId: read('modelId'),
        year: read('year'),
    }
}

function TextField({ label, value, maxLength, onChange }: { label: string; value: string; maxLength: number; onChange: (value: string) => void }) {
    return <label className="grid gap-1 text-xs font-bold text-foreground"><span>{label}</span><input value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value.toUpperCase())} className="h-8 rounded-[var(--radius-control)] border border-border bg-background px-2.5 text-xs font-medium uppercase outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /></label>
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
        ? { title: 'Добавить автомобиль', make: 'Марка автомобиля', model: 'Модель', year: 'Год выпуска', selectMake: 'Выберите марку', selectModel: 'Выберите модель', selectYear: 'Выберите год', registrationNumber: 'Госномер (необязательно)', internalReference: 'Внутренний номер (необязательно)', vin: 'VIN (необязательно)', save: 'Добавить', cancel: 'Отмена', success: 'Автомобиль добавлен', error: 'Не удалось добавить автомобиль' }
        : { title: 'Add vehicle', make: 'Vehicle make', model: 'Model', year: 'Model year', selectMake: 'Select make', selectModel: 'Select model', selectYear: 'Select year', registrationNumber: 'Registration number (optional)', internalReference: 'Internal number (optional)', vin: 'VIN (optional)', save: 'Add vehicle', cancel: 'Cancel', success: 'Vehicle added', error: 'Could not add vehicle' }
}

function getSelectableYears(yearsFrom?: number, yearsTo?: number) {
    const currentYear = new Date().getFullYear()
    const firstYear = yearsFrom ?? currentYear - 40
    const lastYear = Math.min(yearsTo ?? currentYear, currentYear)
    return Array.from({ length: lastYear - firstYear + 1 }, (_, index) => lastYear - index)
}
