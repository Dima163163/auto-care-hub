import { useEffect, useRef, useState, type ReactNode } from 'react'
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
    useUploadOwnerAutoCareProviderLogoMutation,
    useUploadOwnerAutoCareProviderMediaMutation,
    type CreateOwnerAutoCareProviderInput,
} from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'

import type { AutomotiveAmenityId } from '@/entities/automotive-service'
import { prepareProviderMedia } from '@/entities/automotive-service/lib/providerLogoUpload'

type OwnerAutoCareProviderFormProps = {
    market: { id: string; cityName: string } | undefined
}

const inputClassName = 'mt-2 w-full rounded-[var(--radius-control)] border bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary'

export function OwnerAutoCareProviderForm({ market }: OwnerAutoCareProviderFormProps) {
    const { locale, t } = useTranslation()
    const [createProvider, { isLoading }] = useCreateOwnerAutoCareProviderMutation()
    const [uploadLogo, { isLoading: isLogoUploading }] = useUploadOwnerAutoCareProviderLogoMutation()
    const [uploadMedia, { isLoading: isMediaUploading }] = useUploadOwnerAutoCareProviderMediaMutation()
    const [isMultibrand, setIsMultibrand] = useState(true)
    const [chatEnabled, setChatEnabled] = useState(false)
    const [communicationMode, setCommunicationMode] = useState<'online' | 'request_then_confirm' | 'phone_only'>('request_then_confirm')
    const [selectedBrands, setSelectedBrands] = useState<string[]>([])
    const [selectedAmenities, setSelectedAmenities] = useState<AutomotiveAmenityId[]>([...defaultAutomotiveAmenityIds])
    const [additionalPhones, setAdditionalPhones] = useState<number[]>([])
    const nextPhoneId = useRef(0)
    const [documents, setDocuments] = useState<number[]>([])
    const nextDocumentId = useRef(0)
    const [logoPreview, setLogoPreview] = useState<string | null>(null)
    const [coverPreview, setCoverPreview] = useState<string | null>(null)
    const [galleryPreviews, setGalleryPreviews] = useState<string[]>([])

    useEffect(() => () => {
        if (logoPreview) URL.revokeObjectURL(logoPreview)
        if (coverPreview) URL.revokeObjectURL(coverPreview)
        galleryPreviews.forEach((preview) => URL.revokeObjectURL(preview))
    }, [coverPreview, galleryPreviews, logoPreview])

    const toggleValue = <Value extends string>(value: Value, values: Value[], setValues: (nextValues: Value[]) => void) => {
        setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!market) return

        const formData = new FormData(event.currentTarget)
        try {
            const logoFile = formData.get('logo')
            const preparedLogo = logoFile instanceof File && logoFile.size > 0 ? await prepareProviderMedia(logoFile) : null
            const logoUrl = preparedLogo ? (await uploadLogo(preparedLogo).unwrap()).url : null
            const coverFile = formData.get('cover')
            const galleryFiles = formData.getAll('gallery').filter((file): file is File => file instanceof File && file.size > 0)
            const coverUrl = coverFile instanceof File && coverFile.size > 0
                ? (await uploadMedia({ ...(await prepareProviderMedia(coverFile)), kind: 'cover' }).unwrap()).url
                : null
            const galleryUrls = await Promise.all(galleryFiles.slice(0, 12).map(async (file) => (await uploadMedia({ ...(await prepareProviderMedia(file)), kind: 'gallery' }).unwrap()).url))
            const optionalText = (value: FormDataEntryValue | null) => String(value ?? '').trim() || null
            const phones = [...new Set([
                optionalText(formData.get('phone')),
                ...formData.getAll('additionalPhone').map((value) => optionalText(value)),
            ].filter((phone): phone is string => Boolean(phone)))]
            const documentsPayload = formData.getAll('documentLabel').map((label, index) => ({
                label: String(label).trim(),
                reference: String(formData.getAll('documentReference')[index] ?? '').trim(),
                expiresAt: String(formData.getAll('documentExpiresAt')[index] ?? '').trim() || null,
            })).filter((document) => document.label && document.reference)
            const body: CreateOwnerAutoCareProviderInput = {
                name: String(formData.get('name') ?? '').trim(),
                description: String(formData.get('description') ?? '').trim() || undefined,
                marketId: market.id,
                address: String(formData.get('address') ?? '').trim(),
                hours: String(formData.get('hours') ?? '').trim(),
                yearsActive: Number(formData.get('yearsActive') ?? 0),
                staffCount: Number(formData.get('staffCount') ?? 0),
                workstationCount: Number(formData.get('workstationCount') ?? 0),
                teamSize: 'small_team',
                businessType: 'company',
                chatEnabled,
                communicationMode,
                responseWindowMinutes: chatEnabled ? 240 : null,
                responseHours: 'working_hours',
                phoneBookingEnabled: true,
                callbackEnabled: true,
                requestPhotosEnabled: true,
                publicContactNote: null,
                phone: phones[0] ?? null,
                phones,
                email: optionalText(formData.get('email')),
                websiteUrl: optionalText(formData.get('websiteUrl')),
                metroStation: optionalText(formData.get('metroStation')),
                warrantyText: optionalText(formData.get('warrantyText')),
                bonusSummary: optionalText(formData.get('bonusSummary')),
                isMultibrand,
                brandSpecializations: isMultibrand ? [] : selectedBrands,
                amenityIds: selectedAmenities,
                logoUrl,
                coverImageUrl: coverUrl,
                galleryImageUrls: galleryUrls,
                documents: documentsPayload,
            }
            await createProvider(body).unwrap()
            event.currentTarget.reset()
            setIsMultibrand(true)
            setChatEnabled(false)
            setCommunicationMode('request_then_confirm')
            setSelectedBrands([])
            setSelectedAmenities([...defaultAutomotiveAmenityIds])
            setAdditionalPhones([])
            setDocuments([])
            setLogoPreview(null)
            setCoverPreview(null)
            setGalleryPreviews([])
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

            <fieldset disabled={isLoading || isLogoUploading || isMediaUploading || !market} className="space-y-6 disabled:cursor-not-allowed disabled:opacity-60">
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
                    <Field label={t('autocare.ownerProviderWorkstationsLabel')}>
                        <input required min="0" max="100000" defaultValue="0" name="workstationCount" type="number" className={inputClassName} />
                    </Field>
                </div>

                <Field label={t('autocare.ownerProviderDescriptionLabel')}>
                    <textarea name="description" rows={3} className={`${inputClassName} resize-none`} placeholder={t('autocare.ownerProviderDescriptionPlaceholder')} />
                </Field>

                <div className="grid gap-4 border-t pt-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <div className="flex items-end gap-3">
                            <div className="min-w-0 flex-1">
                                <Field label={t('autocare.ownerProviderPhoneLabel')}><input name="phone" type="tel" className={inputClassName} placeholder={t('autocare.ownerProviderPhonePlaceholder')} /></Field>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                className="shrink-0"
                                disabled={additionalPhones.length >= 4}
                                onClick={() => setAdditionalPhones((phones) => [...phones, nextPhoneId.current++])}
                            >
                                {t('autocare.ownerProviderAddPhone')}
                            </Button>
                        </div>
                        {additionalPhones.map((phoneId, index) => (
                            <div key={`additional-phone-${phoneId}`} className="mt-3 flex items-end gap-3">
                                <div className="min-w-0 flex-1">
                                    <Field label={`${t('autocare.ownerProviderPhoneLabel')} ${index + 2}`}>
                                        <input name="additionalPhone" type="tel" className={inputClassName} placeholder={t('autocare.ownerProviderPhonePlaceholder')} />
                                    </Field>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    aria-label={`${t('autocare.ownerProviderRemovePhone')} ${index + 2}`}
                                    onClick={() => setAdditionalPhones((phones) => phones.filter((id) => id !== phoneId))}
                                >
                                    {t('autocare.ownerProviderRemovePhone')}
                                </Button>
                            </div>
                        ))}
                    </div>
                    <Field label={t('autocare.ownerProviderEmailLabel')}><input name="email" type="email" className={inputClassName} placeholder={t('autocare.ownerProviderEmailPlaceholder')} /></Field>
                    <Field label={t('autocare.ownerProviderWebsiteLabel')}><input name="websiteUrl" type="url" className={inputClassName} placeholder={t('autocare.ownerProviderWebsitePlaceholder')} /></Field>
                    <Field label={t('autocare.ownerProviderMetroLabel')}><input name="metroStation" className={inputClassName} placeholder={t('autocare.ownerProviderMetroPlaceholder')} /></Field>
                    <Field label={t('autocare.ownerProviderWarrantyLabel')}><input name="warrantyText" className={inputClassName} placeholder={t('autocare.ownerProviderWarrantyPlaceholder')} /></Field>
                    <Field label={t('autocare.ownerProviderBonusLabel')}><input name="bonusSummary" className={inputClassName} placeholder={t('autocare.ownerProviderBonusPlaceholder')} /></Field>
                </div>

                <section className="grid gap-4 border-t pt-5 md:grid-cols-2">
                    <Field label={t('autocare.ownerProviderLogoLabel')}>
                    <input name="logo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; setLogoPreview(file ? URL.createObjectURL(file) : null) }} className={inputClassName} />
                    <span className="mt-1 block text-xs font-medium text-muted-foreground">{t('autocare.ownerProviderLogoHint')}</span>
                    {logoPreview && <img src={logoPreview} alt="" className="mt-3 size-20 rounded-lg border object-contain p-2" />}
                    </Field>
                    <Field label={t('autocare.ownerProviderCoverLabel')}>
                        <input name="cover" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; setCoverPreview(file ? URL.createObjectURL(file) : null) }} className={inputClassName} />
                        <span className="mt-1 block text-xs font-medium text-muted-foreground">{t('autocare.ownerProviderCoverHint')}</span>
                        {coverPreview && <img src={coverPreview} alt="" className="mt-3 h-20 w-full rounded-lg border object-cover" />}
                    </Field>
                    <Field label={t('autocare.ownerProviderGalleryLabel')}>
                        <input name="gallery" multiple type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { galleryPreviews.forEach((preview) => URL.revokeObjectURL(preview)); setGalleryPreviews(Array.from(event.target.files ?? []).slice(0, 12).map((file) => URL.createObjectURL(file))) }} className={inputClassName} />
                        <span className="mt-1 block text-xs font-medium text-muted-foreground">{t('autocare.ownerProviderGalleryHint')}</span>
                        {galleryPreviews.length > 0 && <div className="mt-3 grid grid-cols-4 gap-2">{galleryPreviews.map((preview) => <img key={preview} src={preview} alt="" className="aspect-square rounded-lg border object-cover" />)}</div>}
                    </Field>
                </section>

                <section className="border-t pt-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-bold">{locale === 'ru' ? 'Документы и подтверждения' : 'Documents and evidence'}</h3>
                            <p className="mt-1 text-xs text-muted-foreground">{locale === 'ru' ? 'Добавьте ссылки на документы в приватном хранилище. Они попадут на проверку и не будут опубликованы.' : 'Add private storage references. Documents go to moderation and are never published.'}</p>
                        </div>
                        <Button type="button" variant="outline" disabled={documents.length >= 20} onClick={() => setDocuments((items) => [...items, nextDocumentId.current++])}>
                            {locale === 'ru' ? 'Добавить документ' : 'Add document'}
                        </Button>
                    </div>
                    {documents.length > 0 && <div className="mt-4 space-y-3">
                        {documents.map((documentId, index) => <div key={`document-${documentId}`} className="grid gap-3 rounded-[var(--radius-card)] border border-border bg-background p-3 sm:grid-cols-[1fr_1.4fr_170px_auto] sm:items-end">
                            <Field label={locale === 'ru' ? 'Название документа' : 'Document name'}><input required name="documentLabel" className={inputClassName} placeholder={locale === 'ru' ? 'Свидетельство ИП' : 'Business certificate'} /></Field>
                            <Field label={locale === 'ru' ? 'Приватная ссылка' : 'Private reference'}><input required name="documentReference" pattern="^private://.*" className={inputClassName} placeholder="private://documents/..." /></Field>
                            <Field label={locale === 'ru' ? 'Действует до' : 'Expires on'}><input name="documentExpiresAt" type="date" className={inputClassName} /></Field>
                            <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label={`${locale === 'ru' ? 'Удалить документ' : 'Remove document'} ${index + 1}`} onClick={() => setDocuments((items) => items.filter((id) => id !== documentId))}>{locale === 'ru' ? 'Удалить' : 'Remove'}</Button>
                        </div>)}
                    </div>}
                </section>

                <section className="border-t pt-5">
                    <h3 className="text-sm font-bold">{locale === 'ru' ? 'Связь с клиентами' : 'Customer contact'}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{locale === 'ru' ? 'По умолчанию новая небольшая команда принимает заявку и подтверждает время по телефону. Чаты можно включить позже в профиле сервиса.' : 'By default, a small new team receives requests and confirms times by phone. You can enable chat later in the service profile.'}</p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label htmlFor="owner-create-chat-enabled" className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-card)] border border-primary/30 bg-primary/5 p-3 text-sm font-bold"><input id="owner-create-chat-enabled" data-testid="owner-create-chat-toggle" type="checkbox" checked={chatEnabled} disabled={communicationMode === 'phone_only'} onChange={(event) => setChatEnabled(event.target.checked)} /><span>{locale === 'ru' ? 'Принимать вопросы в чате' : 'Accept customer chat'}</span></label>
                        <label className="grid gap-1.5 text-xs font-black"><span>{locale === 'ru' ? 'Режим записи' : 'Booking mode'}</span><select className={inputClassName} value={communicationMode} onChange={(event) => { const mode = event.target.value as typeof communicationMode; setCommunicationMode(mode); if (mode === 'phone_only') setChatEnabled(false) }}><option value="request_then_confirm">{locale === 'ru' ? 'Заявка + подтверждение по телефону' : 'Request + phone confirmation'}</option><option value="online">{locale === 'ru' ? 'Онлайн-запись по слотам' : 'Online slots'}</option><option value="phone_only">{locale === 'ru' ? 'Только по телефону' : 'Phone only'}</option></select></label>
                    </div>
                </section>

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
                    <Button type="submit" loading={isLoading || isLogoUploading || isMediaUploading} disabled={!market || (!isMultibrand && selectedBrands.length === 0)}>
                        {isLoading || isLogoUploading || isMediaUploading ? t('autocare.ownerProviderSaving') : t('autocare.ownerProviderSave')}
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
