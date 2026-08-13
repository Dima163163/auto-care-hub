import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
    AutomotiveAmenityIcon,
    automotiveAmenities,
    automotiveVehicleBrands,
    defaultAutomotiveAmenityIds,
    getAutomotiveAmenityLabel,
    getVehicleBrandLabel,
    useCreateOwnerAutoCareProviderMutation,
    type CreateOwnerAutoCareProviderInput,
} from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'

import type { AutomotiveAmenityId } from '@/entities/automotive-service'

type OwnerAutoCareProviderFormProps = {
    market: { id: string; cityName: string } | undefined
}

const inputClassName = 'mt-2 w-full rounded-[var(--radius-control)] border bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary'

export function OwnerAutoCareProviderForm({ market }: OwnerAutoCareProviderFormProps) {
    const { locale, t } = useTranslation()
    const [createProvider, { isLoading }] = useCreateOwnerAutoCareProviderMutation()
    const [isMultibrand, setIsMultibrand] = useState(true)
    const [selectedBrands, setSelectedBrands] = useState<string[]>([])
    const [selectedAmenities, setSelectedAmenities] = useState<AutomotiveAmenityId[]>([...defaultAutomotiveAmenityIds])

    const toggleValue = <Value extends string>(value: Value, values: Value[], setValues: (nextValues: Value[]) => void) => {
        setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!market) return

        const formData = new FormData(event.currentTarget)
        const body: CreateOwnerAutoCareProviderInput = {
            name: String(formData.get('name') ?? '').trim(),
            description: String(formData.get('description') ?? '').trim() || undefined,
            marketId: market.id,
            address: String(formData.get('address') ?? '').trim(),
            hours: String(formData.get('hours') ?? '').trim(),
            yearsActive: Number(formData.get('yearsActive') ?? 0),
            staffCount: Number(formData.get('staffCount') ?? 0),
            isMultibrand,
            brandSpecializations: isMultibrand ? [] : selectedBrands,
            amenityIds: selectedAmenities,
        }

        try {
            await createProvider(body).unwrap()
            event.currentTarget.reset()
            setIsMultibrand(true)
            setSelectedBrands([])
            setSelectedAmenities([...defaultAutomotiveAmenityIds])
            toast.success(t('autocare.ownerProviderCreated'))
        } catch (error) {
            toast.error(getApiErrorMessage(error, t('autocare.ownerProviderCreateFailed')))
        }
    }

    return (
        <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-5 shadow-sm md:p-6">
            <div className="mb-6">
                <h2 className="text-xl font-bold tracking-tight">{t('autocare.ownerProvidersCreateTitle')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('autocare.ownerProvidersCreateDescription')}</p>
            </div>

            <fieldset disabled={isLoading || !market} className="space-y-6 disabled:cursor-not-allowed disabled:opacity-60">
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t('autocare.ownerProviderNameLabel')}>
                        <input required name="name" className={inputClassName} placeholder={t('autocare.ownerProviderNamePlaceholder')} />
                    </Field>
                    <Field label={t('autocare.ownerProviderMarketLabel')}>
                        <input readOnly value={market?.cityName ?? ''} className={inputClassName} placeholder={t('common.loading')} />
                    </Field>
                    <Field label={t('autocare.ownerProviderAddressLabel')}>
                        <input required name="address" className={inputClassName} placeholder={t('autocare.ownerProviderAddressPlaceholder')} />
                    </Field>
                    <Field label={t('autocare.ownerProviderHoursLabel')}>
                        <input required name="hours" className={inputClassName} placeholder={t('autocare.ownerProviderHoursPlaceholder')} />
                    </Field>
                    <Field label={t('autocare.ownerProviderYearsLabel')}>
                        <input required min="0" max="150" defaultValue="0" name="yearsActive" type="number" className={inputClassName} />
                    </Field>
                    <Field label={t('autocare.ownerProviderStaffLabel')}>
                        <input required min="0" max="10000" defaultValue="1" name="staffCount" type="number" className={inputClassName} />
                    </Field>
                </div>

                <Field label={t('autocare.ownerProviderDescriptionLabel')}>
                    <textarea name="description" rows={3} className={`${inputClassName} resize-none`} placeholder={t('autocare.ownerProviderDescriptionPlaceholder')} />
                </Field>

                <section className="border-t pt-5">
                    <h3 className="text-sm font-bold">{t('autocare.ownerProviderBrandsTitle')}</h3>
                    <label className="mt-3 flex items-center gap-3 text-sm font-semibold">
                        <input type="checkbox" checked={isMultibrand} onChange={(event) => setIsMultibrand(event.target.checked)} className="size-4 rounded border-primary accent-primary" />
                        {t('autocare.ownerProviderMultibrand')}
                    </label>
                    {!isMultibrand && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {automotiveVehicleBrands.map((brand) => (
                                <ToggleButton key={brand.id} active={selectedBrands.includes(brand.id)} onClick={() => toggleValue(brand.id, selectedBrands, setSelectedBrands)}>
                                    {getVehicleBrandLabel(brand, locale)}
                                </ToggleButton>
                            ))}
                        </div>
                    )}
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">{t('autocare.ownerProviderBrandsHint')}</p>
                </section>

                <section className="border-t pt-5">
                    <h3 className="text-sm font-bold">{t('autocare.ownerProviderAmenitiesTitle')}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t('autocare.ownerProviderAmenitiesDescription')}</p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {automotiveAmenities.map((amenity) => (
                            <button key={amenity.id} type="button" onClick={() => toggleValue(amenity.id, selectedAmenities, setSelectedAmenities)} aria-pressed={selectedAmenities.includes(amenity.id)} className={`flex min-h-16 items-center gap-3 rounded-[var(--radius-control)] border p-3 text-left text-sm font-semibold transition-colors ${selectedAmenities.includes(amenity.id) ? 'border-primary/45 bg-primary/10 text-foreground' : 'bg-background text-secondary-foreground hover:border-primary/35'}`}>
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><AutomotiveAmenityIcon amenityId={amenity.id} className="size-4" /></span>
                                {getAutomotiveAmenityLabel(amenity, locale)}
                            </button>
                        ))}
                    </div>
                </section>

                <div className="flex justify-end border-t pt-5">
                    <Button type="submit" loading={isLoading} disabled={!market || (!isMultibrand && selectedBrands.length === 0)}>
                        {isLoading ? t('autocare.ownerProviderSaving') : t('autocare.ownerProviderSave')}
                    </Button>
                </div>
            </fieldset>
        </form>
    )
}

function Field({ children, label }: { children: ReactNode; label: string }) {
    return <label className="block text-sm font-semibold text-secondary-foreground"><span>{label}</span>{children}</label>
}

function ToggleButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
    return <button type="button" onClick={onClick} aria-pressed={active} className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${active ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-secondary-foreground hover:border-primary/35'}`}>{children}</button>
}
