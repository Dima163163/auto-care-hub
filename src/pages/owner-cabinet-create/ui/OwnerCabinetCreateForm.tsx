import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router'

import {
    useCreateCabinetMutation,
    useUploadCabinetImageMutation,
} from '@/entities/cabinet'
import { useGetMeQuery } from '@/features/auth'
import { useCabinetImageInput } from '@/entities/cabinet/lib/useCabinetImageInput'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { ROUTES } from '@/shared/constants/routes'
import { readFormDraft } from '@/shared/lib/form-draft'
import { useBeforeUnload } from '@/shared/lib/useBeforeUnload'
import { useFormDraft } from '@/shared/lib/useFormDraft'
import { getAccountScopedStorageKey } from '@/shared/lib/get-account-scoped-storage-key'
import { useProtectedOperation } from '@/shared/lib/operation-safety'
import { useTranslation } from '@/shared/lib/useTranslation'
import { FormDraftNotice } from '@/shared/ui/form-draft-notice'

import {
    createOwnerCabinetCreateSchema,
    type OwnerCabinetCreateFormValues,
} from '../lib/ownerCabinetCreateSchema'
import { OwnerCabinetCreateFormActions } from './OwnerCabinetCreateFormActions'
import { OwnerCabinetCreateFormFields } from './OwnerCabinetCreateFormFields'

const defaultValues: OwnerCabinetCreateFormValues = {
    title: '',
    description: '',
    address: '',
    city: '',
    pricePerHour: 1500,
}

type OwnerCabinetCreateDraft = {
    title?: string | undefined
    description?: string | undefined
    address?: string | undefined
    city?: string | undefined
    pricePerHour?: number | undefined
}

const CREATE_FORM_DRAFT_NAMESPACE = 'autocare-hub:owner-cabinet-create:v2'

export function OwnerCabinetCreateForm() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { data: user } = useGetMeQuery()
    const [formError, setFormError] = useState<string | null>(null)
    const [createCabinet, { isLoading }] = useCreateCabinetMutation()
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
    const schema = useMemo(() => createOwnerCabinetCreateSchema(t), [t])
    const draftStorageKey = getAccountScopedStorageKey(
        CREATE_FORM_DRAFT_NAMESPACE,
        user?.id,
    )
    const savedDraft = useMemo(() => {
        if (!draftStorageKey) {
            return null
        }

        const storedDraft = readFormDraft<OwnerCabinetCreateDraft>(
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
            title: storedDraft.title ?? defaultValues.title,
            description: storedDraft.description ?? defaultValues.description,
            address: storedDraft.address ?? defaultValues.address,
            city: storedDraft.city ?? defaultValues.city,
            pricePerHour: storedDraft.pricePerHour ?? defaultValues.pricePerHour,
        }
    }, [draftStorageKey, schema])

    const {
        register,
        handleSubmit,
        reset,
        control,
        formState: { errors, isDirty, isSubmitting },
    } = useForm<OwnerCabinetCreateFormValues>({
        resolver: zodResolver(schema),
        defaultValues: savedDraft ?? defaultValues,
    })

    const [showDraftNotice, setShowDraftNotice] = useState(
        savedDraft !== null,
    )
    const watchedValues = useWatch({ control })
    const isCreating = isSubmitting || isLoading || isUploadingImage
    useProtectedOperation('pendingMutations', isCreating)
    const { clearDraft } = useFormDraft({
        storageKey: draftStorageKey,
        values: watchedValues,
        enabled: isDirty && !isCreating,
    })
    useBeforeUnload(isDirty && !isCreating)

    const onSubmit = async (values: OwnerCabinetCreateFormValues) => {
        let imageWasUploaded = hasUploadedImage

        try {
            setFormError(null)
            clearImageError()

            const photos: string[] = []
            const uploadResult = await uploadSelectedImage((payload) =>
                uploadCabinetImage(payload).unwrap()
            )

            if (uploadResult) {
                photos.push(uploadResult.url)
                imageWasUploaded = true
            }

            await createCabinet({
                ...values,
                photos,
            }).unwrap()

            clearDraft()
            setShowDraftNotice(false)
            navigate(ROUTES.ownerCabinets)
        } catch (error) {
            const message = getApiErrorMessage(error, t('cabinet.form.createdFailed'))
            setFormError(
                imageWasUploaded
                    ? `${message} ${t('cabinet.form.imageUploadedSaveFailed')}`
                    : message,
            )
        }
    }

    const handleDiscardDraft = () => {
        clearDraft()
        reset(defaultValues)
        setShowDraftNotice(false)
    }

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="rounded-xl border bg-card p-6 shadow-sm"
        >
            {showDraftNotice && <FormDraftNotice onDiscard={handleDiscardDraft} />}

            {formError && (
                <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                    <p className="text-sm font-medium text-destructive">
                        {formError}
                    </p>
                </div>
            )}

            <OwnerCabinetCreateFormFields
                errors={errors}
                imageError={imageError}
                imageUrl={imagePreviewUrl}
                register={register}
                onImageChange={handleImageChange}
            />

            <OwnerCabinetCreateFormActions
                isCreating={isCreating}
                isUploadingImage={isUploadingImage}
            />
        </form>
    )
}
