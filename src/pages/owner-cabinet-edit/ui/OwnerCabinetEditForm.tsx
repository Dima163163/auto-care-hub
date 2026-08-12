import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import type { Cabinet } from '@/entities/cabinet'
import {
    useUpdateCabinetMutation,
    useUploadCabinetImageMutation,
} from '@/entities/cabinet'
import { useGetMeQuery } from '@/features/auth'
import { useCabinetImageInput } from '@/entities/cabinet/lib/useCabinetImageInput'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { ROUTES } from '@/shared/constants/routes'
import { readFormDraft } from '@/shared/lib/form-draft'
import { getMediaUrl } from '@/shared/lib/getMediaUrl'
import { useBeforeUnload } from '@/shared/lib/useBeforeUnload'
import { useFormDraft } from '@/shared/lib/useFormDraft'
import { getAccountScopedStorageKey } from '@/shared/lib/get-account-scoped-storage-key'
import { useProtectedOperation } from '@/shared/lib/operation-safety'
import { useTranslation } from '@/shared/lib/useTranslation'
import { FormDraftNotice } from '@/shared/ui/form-draft-notice'

import {
    createOwnerCabinetEditSchema,
    type OwnerCabinetEditFormValues,
} from '../lib/ownerCabinetEditSchema'
import { OwnerCabinetEditFormActions } from './OwnerCabinetEditFormActions'
import { OwnerCabinetEditFormFields } from './OwnerCabinetEditFormFields'
import { OwnerCabinetScheduleFields } from './OwnerCabinetScheduleFields'
import { OwnerCabinetScheduleExceptions } from './OwnerCabinetScheduleExceptions'
import { OwnerCabinetBlockedPeriods } from './OwnerCabinetBlockedPeriods'

type OwnerCabinetEditFormProps = {
    cabinet: Cabinet
}

type OwnerCabinetEditDraft = {
    title?: string | undefined
    description?: string | undefined
    address?: string | undefined
    city?: string | undefined
    pricePerHour?: number | undefined
    timezone?: string | undefined
    amenities?: string | undefined
    cancellationPolicy?: string | undefined
    houseRules?: string | undefined
}

function getServerValues(cabinet: Cabinet): OwnerCabinetEditFormValues {
    return {
        title: cabinet.title,
        description: cabinet.description,
        address: cabinet.address,
        city: cabinet.city,
        pricePerHour: cabinet.pricePerHour,
        timezone: cabinet.timezone ?? 'UTC',
        amenities: cabinet.amenities?.join(', ') ?? '',
        cancellationPolicy: cabinet.cancellationPolicy ?? '',
        houseRules: cabinet.houseRules ?? '',
    }
}

export function OwnerCabinetEditForm({
    cabinet,
}: OwnerCabinetEditFormProps) {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { data: user } = useGetMeQuery()
    const [formError, setFormError] = useState<string | null>(null)
    const [updateCabinet, { isLoading: isUpdating }] = useUpdateCabinetMutation()
    const [uploadCabinetImage, { isLoading: isUploadingImage }] =
        useUploadCabinetImageMutation()
    const {
        clearImageError,
        hasUploadedImage,
        handleImageChange,
        imageError,
        imagePreviewUrl,
        uploadSelectedImage,
    } = useCabinetImageInput()
    const schema = useMemo(() => createOwnerCabinetEditSchema(t), [t])
    const draftStorageKey = getAccountScopedStorageKey(
        'autocare-hub:owner-cabinet-edit:v2',
        user?.id,
        cabinet.id,
    )
    const serverValues = useMemo(() => getServerValues(cabinet), [cabinet])
    const savedDraft = useMemo(() => {
        if (!draftStorageKey) {
            return null
        }

        const storedDraft = readFormDraft<OwnerCabinetEditDraft>(
            draftStorageKey,
            (value) => {
                const parsedDraft = schema.partial().safeParse(value)

                return parsedDraft.success ? parsedDraft.data : null
            },
        )

        if (!storedDraft) {
            return null
        }

        return {
            title: storedDraft.title ?? serverValues.title,
            description: storedDraft.description ?? serverValues.description,
            address: storedDraft.address ?? serverValues.address,
            city: storedDraft.city ?? serverValues.city,
            pricePerHour: storedDraft.pricePerHour ?? serverValues.pricePerHour,
            timezone: storedDraft.timezone ?? serverValues.timezone,
            amenities: storedDraft.amenities ?? serverValues.amenities,
            cancellationPolicy:
                storedDraft.cancellationPolicy ?? serverValues.cancellationPolicy,
            houseRules: storedDraft.houseRules ?? serverValues.houseRules,
        }
    }, [draftStorageKey, schema, serverValues])

    const {
        register,
        handleSubmit,
        reset,
        control,
        formState: { errors, isDirty, isSubmitting },
    } = useForm<OwnerCabinetEditFormValues>({
        resolver: zodResolver(schema),
        defaultValues: savedDraft ?? serverValues,
    })

    const [showDraftNotice, setShowDraftNotice] = useState(
        savedDraft !== null,
    )
    const lastResetCabinetIdRef = useRef<string | null>(null)

    useEffect(() => {
        if (lastResetCabinetIdRef.current === cabinet.id) {
            return
        }

        lastResetCabinetIdRef.current = cabinet.id
        reset(savedDraft ?? serverValues)
        setShowDraftNotice(savedDraft !== null)
    }, [cabinet.id, reset, savedDraft, serverValues])

    const watchedValues = useWatch({ control })
    const isSaving = isSubmitting || isUpdating || isUploadingImage
    useProtectedOperation('pendingMutations', isSaving)
    const { clearDraft } = useFormDraft({
        storageKey: draftStorageKey,
        values: watchedValues,
        enabled: isDirty && !isSaving,
    })
    useBeforeUnload(isDirty && !isSaving)

    const onSubmit = async (values: OwnerCabinetEditFormValues) => {
        let imageWasUploaded = hasUploadedImage

        setFormError(null)
        clearImageError()

        try {
            const uploadedPhotos: string[] = []
            const uploadResult = await uploadSelectedImage((payload) =>
                uploadCabinetImage(payload).unwrap()
            )

            if (uploadResult) {
                uploadedPhotos.push(uploadResult.url)
                imageWasUploaded = true
            }

            const { amenities, cancellationPolicy, houseRules, ...cabinetValues } = values
            await updateCabinet({
                id: cabinet.id,
                ...cabinetValues,
                amenities: amenities.split(',').map((item) => item.trim()).filter(Boolean),
                cancellationPolicy: cancellationPolicy.trim() || null,
                houseRules: houseRules.trim() || null,
                ...(uploadedPhotos.length > 0 ? { photos: uploadedPhotos } : {}),
            }).unwrap()

            clearDraft()
            setShowDraftNotice(false)
            toast.success(t('cabinet.form.updatedSuccessfully'))
            navigate(ROUTES.ownerCabinets)
        } catch (error) {
            const message = getApiErrorMessage(
                error,
                t('cabinet.form.updatedFailed'),
            )
            const visibleMessage = imageWasUploaded
                ? `${message} ${t('cabinet.form.imageUploadedSaveFailed')}`
                : message
            setFormError(visibleMessage)
            toast.error(visibleMessage)
        }
    }

    const [currentPhoto] = cabinet.photos
    const currentPhotoUrl = currentPhoto ? getMediaUrl(currentPhoto) : undefined
    const previewUrl = imagePreviewUrl ?? currentPhotoUrl

    const handleDiscardDraft = () => {
        clearDraft()
        reset(serverValues)
        setShowDraftNotice(false)
    }

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="max-w-3xl rounded-xl border bg-card p-6 shadow-sm"
        >
            {showDraftNotice && <FormDraftNotice onDiscard={handleDiscardDraft} />}

            {formError && (
                <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
                    <p className="text-sm font-medium text-destructive">
                        {formError}
                    </p>
                </div>
            )}

            <OwnerCabinetEditFormFields
                errors={errors}
                imageError={imageError}
                imageUrl={previewUrl}
                register={register}
                onImageChange={handleImageChange}
            />

            <OwnerCabinetScheduleFields cabinetId={cabinet.id} />
            <OwnerCabinetScheduleExceptions cabinetId={cabinet.id} />
            <OwnerCabinetBlockedPeriods cabinetId={cabinet.id} />

            <OwnerCabinetEditFormActions
                isSaving={isSaving}
                isUploadingImage={isUploadingImage}
            />
        </form>
    )
}
