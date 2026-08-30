import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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
import { readFormDraft } from '@/shared/lib/form-draft'
import { useFormDraft } from '@/shared/lib/useFormDraft'
import { FormDraftNotice } from '@/shared/ui/form-draft-notice/FormDraftNotice'
import { useTranslation } from '@/shared/lib/useTranslation'

import type { AutomotiveAmenityId } from '@/entities/automotive-service'
import { prepareProviderMedia } from '@/entities/automotive-service/lib/providerLogoUpload'

import {
    DEFAULT_OWNER_PROVIDER_DRAFT,
    EMPTY_OWNER_PROVIDER_TEXT_DRAFT,
    parseOwnerProviderDraft,
    type OwnerProviderTextDraft,
} from './owner-provider-draft'
import { validateOwnerProviderForm, type OwnerProviderFormValidationReason } from './owner-provider-form-validation'

type OwnerAutoCareProviderFormProps = {
    market: { id: string; cityName: string } | undefined
}

type ProviderMediaCacheEntry = {
    key: string
    url: string
}

type ProviderMediaCache = {
    logo: ProviderMediaCacheEntry | null
    cover: ProviderMediaCacheEntry | null
    gallery: ProviderMediaCacheEntry[]
}

const EMPTY_PROVIDER_MEDIA_CACHE: ProviderMediaCache = { logo: null, cover: null, gallery: [] }

const inputClassName = 'mt-2 w-full rounded-[var(--radius-control)] border bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary'

function isKnownAmenityId(id: string): id is AutomotiveAmenityId {
    return automotiveAmenities.some((amenity) => amenity.id === id)
}

function isUploadFile(value: FormDataEntryValue | null): value is File {
    return typeof value === 'object'
        && value !== null
        && 'name' in value
        && typeof value.name === 'string'
        && 'size' in value
        && typeof value.size === 'number'
        && 'type' in value
        && typeof value.type === 'string'
}

function getUploadFileKey(file: File) {
    return `${file.name}:${file.size}:${file.lastModified}:${file.type}`
}

export function OwnerAutoCareProviderForm({ market }: OwnerAutoCareProviderFormProps) {
    const { locale, t } = useTranslation()
    const formRef = useRef<HTMLFormElement>(null)
    const [createProvider, { isLoading }] = useCreateOwnerAutoCareProviderMutation()
    const [uploadLogo, { isLoading: isLogoUploading }] = useUploadOwnerAutoCareProviderLogoMutation()
    const [uploadMedia, { isLoading: isMediaUploading }] = useUploadOwnerAutoCareProviderMediaMutation()
    const storageKey = `autocare-owner-provider:${market?.id ?? 'new'}`
    const initialDraft = useMemo(() => readFormDraft(storageKey, parseOwnerProviderDraft), [storageKey])
    const initialAmenities = initialDraft?.selectedAmenities.filter(isKnownAmenityId) ?? [...defaultAutomotiveAmenityIds]
    const [textDraft, setTextDraft] = useState<OwnerProviderTextDraft>(() => initialDraft?.text ?? EMPTY_OWNER_PROVIDER_TEXT_DRAFT)
    const [isMultibrand, setIsMultibrand] = useState(() => initialDraft?.isMultibrand ?? true)
    const [chatEnabled, setChatEnabled] = useState(() => initialDraft?.communicationMode === 'phone_only' ? false : initialDraft?.chatEnabled ?? false)
    const [communicationMode, setCommunicationMode] = useState<'online' | 'request_then_confirm' | 'phone_only'>(() => initialDraft?.communicationMode ?? 'request_then_confirm')
    const [selectedBrands, setSelectedBrands] = useState<string[]>(() => initialDraft?.selectedBrands ?? [])
    const [selectedAmenities, setSelectedAmenities] = useState<AutomotiveAmenityId[]>(initialAmenities)
    const [additionalPhones, setAdditionalPhones] = useState<Array<{ id: number; value: string }>>([])
    const nextPhoneId = useRef(0)
    const [documents, setDocuments] = useState<number[]>([])
    const nextDocumentId = useRef(0)
    const [logoPreview, setLogoPreview] = useState<string | null>(null)
    const [coverPreview, setCoverPreview] = useState<string | null>(null)
    const [galleryPreviews, setGalleryPreviews] = useState<string[]>([])
    const [formError, setFormError] = useState<OwnerProviderFormValidationReason | null>(null)
    const [mediaError, setMediaError] = useState(false)
    const [uploadedMedia, setUploadedMedia] = useState<ProviderMediaCache>(EMPTY_PROVIDER_MEDIA_CACHE)
    const [isDraftRestored, setIsDraftRestored] = useState(() => Boolean(initialDraft))
    const draftSnapshot = useMemo(() => ({
        text: textDraft,
        isMultibrand,
        chatEnabled,
        communicationMode,
        selectedBrands,
        selectedAmenities,
    }), [chatEnabled, communicationMode, isMultibrand, selectedAmenities, selectedBrands, textDraft])
    const hasDraftableValues = Boolean(
        Object.values(textDraft).some(Boolean)
        || !isMultibrand
        || chatEnabled
        || communicationMode !== DEFAULT_OWNER_PROVIDER_DRAFT.communicationMode
        || selectedBrands.length > 0
        || selectedAmenities.length !== defaultAutomotiveAmenityIds.length
        || selectedAmenities.some((amenityId) => !defaultAutomotiveAmenityIds.includes(amenityId)),
    )
    const { clearDraft } = useFormDraft({
        storageKey,
        values: draftSnapshot,
        enabled: hasDraftableValues,
        parse: parseOwnerProviderDraft,
    })

    const updateText = <Key extends keyof OwnerProviderTextDraft>(key: Key, value: OwnerProviderTextDraft[Key]) => {
        setFormError(null)
        setTextDraft((current) => ({ ...current, [key]: value }))
    }

    const discardDraft = () => {
        clearDraft()
        formRef.current?.reset()
        setTextDraft(EMPTY_OWNER_PROVIDER_TEXT_DRAFT)
        setIsMultibrand(DEFAULT_OWNER_PROVIDER_DRAFT.isMultibrand)
        setChatEnabled(DEFAULT_OWNER_PROVIDER_DRAFT.chatEnabled)
        setCommunicationMode(DEFAULT_OWNER_PROVIDER_DRAFT.communicationMode)
        setSelectedBrands([])
        setSelectedAmenities([...defaultAutomotiveAmenityIds])
        setAdditionalPhones([])
        setDocuments([])
        setLogoPreview(null)
        setCoverPreview(null)
        setGalleryPreviews([])
        setFormError(null)
        setMediaError(false)
        setUploadedMedia(EMPTY_PROVIDER_MEDIA_CACHE)
        setIsDraftRestored(false)
    }

    useEffect(() => () => {
        if (logoPreview) URL.revokeObjectURL(logoPreview)
        if (coverPreview) URL.revokeObjectURL(coverPreview)
        galleryPreviews.forEach((preview) => URL.revokeObjectURL(preview))
    }, [coverPreview, galleryPreviews, logoPreview])

    const toggleValue = <Value extends string>(value: Value, values: Value[], setValues: (nextValues: Value[]) => void) => {
        setFormError(null)
        setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
    }

    const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setMediaError(false)
        const file = event.target.files?.[0]
        setLogoPreview(file ? URL.createObjectURL(file) : null)
        setUploadedMedia((current) => file && current.logo?.key === getUploadFileKey(file)
            ? current
            : { ...current, logo: null })
    }

    const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setMediaError(false)
        const file = event.target.files?.[0]
        setCoverPreview(file ? URL.createObjectURL(file) : null)
        setUploadedMedia((current) => file && current.cover?.key === getUploadFileKey(file)
            ? current
            : { ...current, cover: null })
    }

    const handleGalleryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setMediaError(false)
        galleryPreviews.forEach((preview) => URL.revokeObjectURL(preview))
        const files = Array.from(event.target.files ?? []).slice(0, 12)
        const keys = new Set(files.map(getUploadFileKey))
        setGalleryPreviews(files.map((file) => URL.createObjectURL(file)))
        setUploadedMedia((current) => ({ ...current, gallery: current.gallery.filter((entry) => keys.has(entry.key)) }))
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setFormError(null)
        setMediaError(false)
        if (!market) {
            setFormError('market')
            return
        }

        const form = event.currentTarget
        const formData = new FormData(form)
        const optionalText = (value: FormDataEntryValue | null) => String(value ?? '').trim()
        const phones = [
            optionalText(formData.get('phone')),
            ...formData.getAll('additionalPhone').map((value) => optionalText(value)),
        ]
        const documentsDraft = formData.getAll('documentLabel').map((label, index) => ({
            label: String(label),
            reference: String(formData.getAll('documentReference')[index] ?? ''),
            expiresAt: String(formData.getAll('documentExpiresAt')[index] ?? ''),
        }))
        const validation = validateOwnerProviderForm({
            marketId: market.id,
            name: String(formData.get('name') ?? ''),
            description: String(formData.get('description') ?? ''),
            address: String(formData.get('address') ?? ''),
            hours: String(formData.get('hours') ?? ''),
            yearsActive: String(formData.get('yearsActive') ?? ''),
            staffCount: String(formData.get('staffCount') ?? ''),
            workstationCount: String(formData.get('workstationCount') ?? ''),
            phones,
            email: optionalText(formData.get('email')),
            websiteUrl: optionalText(formData.get('websiteUrl')),
            metroStation: optionalText(formData.get('metroStation')),
            warrantyText: optionalText(formData.get('warrantyText')),
            bonusSummary: optionalText(formData.get('bonusSummary')),
            documents: documentsDraft,
            isMultibrand,
            brandSpecializations: selectedBrands,
        })
        if (!validation.valid) {
            setFormError(validation.reason)
            return
        }

        let mediaStage = false
        let mediaCache = uploadedMedia
        try {
            const logoFile = form.querySelector<HTMLInputElement>('input[name="logo"]')?.files?.[0] ?? null
            const hasLogo = isUploadFile(logoFile) && logoFile.size > 0
            const logoKey = hasLogo ? getUploadFileKey(logoFile) : null
            let logoUrl = logoKey && mediaCache.logo?.key === logoKey ? mediaCache.logo.url : null
            if (hasLogo && !logoUrl) {
                mediaStage = true
                const preparedLogo = await prepareProviderMedia(logoFile)
                logoUrl = (await uploadLogo(preparedLogo).unwrap()).url
                mediaCache = { ...mediaCache, logo: { key: logoKey, url: logoUrl } }
                setUploadedMedia(mediaCache)
            }
            mediaStage = false
            const coverFile = form.querySelector<HTMLInputElement>('input[name="cover"]')?.files?.[0] ?? null
            const galleryFiles = Array.from(form.querySelector<HTMLInputElement>('input[name="gallery"]')?.files ?? []).filter((file): file is File => isUploadFile(file) && file.size > 0)
            const hasCover = isUploadFile(coverFile) && coverFile.size > 0
            const coverKey = hasCover ? getUploadFileKey(coverFile) : null
            let coverUrl = coverKey && mediaCache.cover?.key === coverKey ? mediaCache.cover.url : null
            if (hasCover && !coverUrl) {
                mediaStage = true
                coverUrl = (await uploadMedia({ ...(await prepareProviderMedia(coverFile)), kind: 'cover' }).unwrap()).url
                mediaCache = { ...mediaCache, cover: { key: coverKey, url: coverUrl } }
                setUploadedMedia(mediaCache)
            }
            mediaStage = false
            const galleryUrls: string[] = []
            for (const file of galleryFiles.slice(0, 12)) {
                const key = getUploadFileKey(file)
                const cached = mediaCache.gallery.find((entry) => entry.key === key)
                if (cached) {
                    galleryUrls.push(cached.url)
                    continue
                }

                mediaStage = true
                const url = (await uploadMedia({ ...(await prepareProviderMedia(file)), kind: 'gallery' }).unwrap()).url
                galleryUrls.push(url)
                mediaCache = { ...mediaCache, gallery: [...mediaCache.gallery.filter((entry) => entry.key !== key), { key, url }] }
                setUploadedMedia(mediaCache)
                mediaStage = false
            }
            mediaStage = false
            const body: CreateOwnerAutoCareProviderInput = {
                name: validation.name,
                description: validation.description,
                marketId: validation.marketId,
                address: validation.address,
                hours: validation.hours,
                yearsActive: validation.yearsActive,
                staffCount: validation.staffCount,
                workstationCount: validation.workstationCount,
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
                phone: validation.phones[0] ?? null,
                phones: validation.phones,
                email: validation.email,
                websiteUrl: validation.websiteUrl,
                metroStation: validation.metroStation,
                warrantyText: validation.warrantyText,
                bonusSummary: validation.bonusSummary,
                isMultibrand,
                brandSpecializations: isMultibrand ? [] : selectedBrands,
                amenityIds: selectedAmenities,
                logoUrl,
                coverImageUrl: coverUrl,
                galleryImageUrls: galleryUrls,
                documents: validation.documents,
            }
            await createProvider(body).unwrap()
            form.reset()
            clearDraft()
            setTextDraft(EMPTY_OWNER_PROVIDER_TEXT_DRAFT)
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
            setFormError(null)
            setMediaError(false)
            setUploadedMedia(EMPTY_PROVIDER_MEDIA_CACHE)
            setIsDraftRestored(false)
            toast.success(t('autocare.ownerProviderCreated'))
        } catch (error) {
            if (mediaStage) setMediaError(true)
            toast.error(getApiErrorMessage(error, t('autocare.ownerProviderCreateFailed')))
        }
    }

    return (
        <form ref={formRef} onSubmit={handleSubmit} className="rounded-xl border bg-card p-5 shadow-sm md:p-6">
            <div className="mb-6">
                <h2 className="text-xl font-bold tracking-tight">{t('autocare.ownerProvidersCreateTitle')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('autocare.ownerProvidersCreateDescription')}</p>
            </div>
            {isDraftRestored ? <FormDraftNotice onDiscard={discardDraft} /> : null}
            {formError ? <p id="owner-provider-form-error" role="alert" className="mb-4 rounded-[var(--radius-control)] border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{t('autocare.ownerProviderValidationError')}</p> : null}
            {mediaError ? <p id="owner-provider-media-error" role="alert" className="mb-4 rounded-[var(--radius-control)] border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{t('autocare.ownerProviderMediaUploadFailed')}</p> : null}

            <fieldset disabled={isLoading || isLogoUploading || isMediaUploading || !market} className="space-y-6 disabled:cursor-not-allowed disabled:opacity-60">
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t('autocare.ownerProviderNameLabel')}>
                        <input required minLength={2} maxLength={160} name="name" value={textDraft.name} onChange={(event) => updateText('name', event.target.value)} aria-invalid={formError === 'name'} aria-describedby={formError ? 'owner-provider-form-error' : undefined} className={inputClassName} placeholder={t('autocare.ownerProviderNamePlaceholder')} />
                    </Field>
                    <Field label={t('autocare.ownerProviderMarketLabel')}>
                        <input readOnly value={market?.cityName ?? ''} className={inputClassName} placeholder={t('common.loading')} />
                    </Field>
                    <Field label={t('autocare.ownerProviderAddressLabel')}>
                        <input required minLength={2} maxLength={240} name="address" value={textDraft.address} onChange={(event) => updateText('address', event.target.value)} aria-invalid={formError === 'address'} aria-describedby={formError ? 'owner-provider-form-error' : undefined} className={inputClassName} placeholder={t('autocare.ownerProviderAddressPlaceholder')} />
                    </Field>
                    <Field label={t('autocare.ownerProviderHoursLabel')}>
                        <input required minLength={2} maxLength={120} name="hours" value={textDraft.hours} onChange={(event) => updateText('hours', event.target.value)} aria-invalid={formError === 'hours'} aria-describedby={formError ? 'owner-provider-form-error' : undefined} className={inputClassName} placeholder={t('autocare.ownerProviderHoursPlaceholder')} />
                    </Field>
                    <Field label={t('autocare.ownerProviderYearsLabel')}>
                        <input required min="0" max="150" step="1" name="yearsActive" type="number" value={textDraft.yearsActive} onChange={(event) => updateText('yearsActive', event.target.value)} aria-invalid={formError === 'yearsActive'} aria-describedby={formError ? 'owner-provider-form-error' : undefined} className={inputClassName} />
                    </Field>
                    <Field label={t('autocare.ownerProviderStaffLabel')}>
                        <input required min="0" max="10000" step="1" name="staffCount" type="number" value={textDraft.staffCount} onChange={(event) => updateText('staffCount', event.target.value)} aria-invalid={formError === 'staffCount'} aria-describedby={formError ? 'owner-provider-form-error' : undefined} className={inputClassName} />
                    </Field>
                    <Field label={t('autocare.ownerProviderWorkstationsLabel')}>
                        <input required min="0" max="100000" step="1" name="workstationCount" type="number" value={textDraft.workstationCount} onChange={(event) => updateText('workstationCount', event.target.value)} aria-invalid={formError === 'workstationCount'} aria-describedby={formError ? 'owner-provider-form-error' : undefined} className={inputClassName} />
                    </Field>
                </div>

                <Field label={t('autocare.ownerProviderDescriptionLabel')}>
                    <textarea name="description" rows={3} maxLength={5000} value={textDraft.description} onChange={(event) => updateText('description', event.target.value)} aria-invalid={formError === 'description'} aria-describedby={formError ? 'owner-provider-form-error' : undefined} className={`${inputClassName} resize-none`} placeholder={t('autocare.ownerProviderDescriptionPlaceholder')} />
                </Field>

                <div className="grid gap-4 border-t pt-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <div className="flex items-end gap-3">
                            <div className="min-w-0 flex-1">
                                <Field label={t('autocare.ownerProviderPhoneLabel')}><input name="phone" type="tel" minLength={5} maxLength={32} className={inputClassName} placeholder={t('autocare.ownerProviderPhonePlaceholder')} /></Field>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                className="shrink-0"
                                disabled={additionalPhones.length >= 4}
                                onClick={() => setAdditionalPhones((phones) => [...phones, { id: nextPhoneId.current++, value: '' }])}
                            >
                                {t('autocare.ownerProviderAddPhone')}
                            </Button>
                        </div>
                        {additionalPhones.map((phone, index) => (
                            <div key={`additional-phone-${phone.id}`} className="mt-3 flex items-end gap-3">
                                <div className="min-w-0 flex-1">
                                    <Field label={`${t('autocare.ownerProviderPhoneLabel')} ${index + 2}`}>
                                        <input name="additionalPhone" type="tel" minLength={5} maxLength={32} value={phone.value} onChange={(event) => { setFormError(null); setAdditionalPhones((phones) => phones.map((item) => item.id === phone.id ? { ...item, value: event.target.value } : item)) }} className={inputClassName} placeholder={t('autocare.ownerProviderPhonePlaceholder')} />
                                    </Field>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    aria-label={`${t('autocare.ownerProviderRemovePhone')} ${index + 2}`}
                                    onClick={() => setAdditionalPhones((phones) => phones.filter((item) => item.id !== phone.id))}
                                >
                                    {t('autocare.ownerProviderRemovePhone')}
                                </Button>
                            </div>
                        ))}
                    </div>
                    <Field label={t('autocare.ownerProviderEmailLabel')}><input name="email" type="email" maxLength={320} className={inputClassName} placeholder={t('autocare.ownerProviderEmailPlaceholder')} /></Field>
                    <Field label={t('autocare.ownerProviderWebsiteLabel')}><input name="websiteUrl" type="url" maxLength={500} value={textDraft.websiteUrl} onChange={(event) => updateText('websiteUrl', event.target.value)} className={inputClassName} placeholder={t('autocare.ownerProviderWebsitePlaceholder')} /></Field>
                    <Field label={t('autocare.ownerProviderMetroLabel')}><input name="metroStation" maxLength={120} value={textDraft.metroStation} onChange={(event) => updateText('metroStation', event.target.value)} className={inputClassName} placeholder={t('autocare.ownerProviderMetroPlaceholder')} /></Field>
                    <Field label={t('autocare.ownerProviderWarrantyLabel')}><input name="warrantyText" maxLength={500} value={textDraft.warrantyText} onChange={(event) => updateText('warrantyText', event.target.value)} className={inputClassName} placeholder={t('autocare.ownerProviderWarrantyPlaceholder')} /></Field>
                    <Field label={t('autocare.ownerProviderBonusLabel')}><input name="bonusSummary" maxLength={500} value={textDraft.bonusSummary} onChange={(event) => updateText('bonusSummary', event.target.value)} className={inputClassName} placeholder={t('autocare.ownerProviderBonusPlaceholder')} /></Field>
                </div>

                <section className="grid gap-4 border-t pt-5 md:grid-cols-2">
                    <Field label={t('autocare.ownerProviderLogoLabel')}>
                    <input name="logo" type="file" accept="image/jpeg,image/png,image/webp" aria-invalid={mediaError} aria-describedby={mediaError ? 'owner-provider-media-error' : undefined} onChange={handleLogoChange} className={inputClassName} />
                    <span className="mt-1 block text-xs font-medium text-muted-foreground">{t('autocare.ownerProviderLogoHint')}</span>
                    {logoPreview && <img src={logoPreview} alt="" className="mt-3 size-20 rounded-lg border object-contain p-2" />}
                    </Field>
                    <Field label={t('autocare.ownerProviderCoverLabel')}>
                        <input name="cover" type="file" accept="image/jpeg,image/png,image/webp" aria-invalid={mediaError} aria-describedby={mediaError ? 'owner-provider-media-error' : undefined} onChange={handleCoverChange} className={inputClassName} />
                        <span className="mt-1 block text-xs font-medium text-muted-foreground">{t('autocare.ownerProviderCoverHint')}</span>
                        {coverPreview && <img src={coverPreview} alt="" className="mt-3 h-20 w-full rounded-lg border object-cover" />}
                    </Field>
                    <Field label={t('autocare.ownerProviderGalleryLabel')}>
                        <input name="gallery" multiple type="file" accept="image/jpeg,image/png,image/webp" aria-invalid={mediaError} aria-describedby={mediaError ? 'owner-provider-media-error' : undefined} onChange={handleGalleryChange} className={inputClassName} />
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
                            <Field label={locale === 'ru' ? 'Название документа' : 'Document name'}><input required maxLength={160} name="documentLabel" className={inputClassName} placeholder={locale === 'ru' ? 'Свидетельство ИП' : 'Business certificate'} /></Field>
                            <Field label={locale === 'ru' ? 'Приватная ссылка' : 'Private reference'}><input required maxLength={500} name="documentReference" pattern="^private://.*" className={inputClassName} placeholder="private://documents/..." /></Field>
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
                        <label className="grid gap-1.5 text-xs font-black"><span>{locale === 'ru' ? 'Режим записи' : 'Booking mode'}</span><select className={inputClassName} value={communicationMode} onChange={(event) => { const mode = event.target.value as typeof communicationMode; setFormError(null); setCommunicationMode(mode); if (mode === 'phone_only') setChatEnabled(false) }}><option value="request_then_confirm">{locale === 'ru' ? 'Заявка + подтверждение по телефону' : 'Request + phone confirmation'}</option><option value="online">{locale === 'ru' ? 'Онлайн-запись по слотам' : 'Online slots'}</option><option value="phone_only">{locale === 'ru' ? 'Только по телефону' : 'Phone only'}</option></select></label>
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
