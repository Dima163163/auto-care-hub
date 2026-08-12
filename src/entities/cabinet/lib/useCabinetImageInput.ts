import { useEffect, useMemo, useState } from 'react'

import { getApiErrorCode } from '@/shared/api/getApiErrorMessage'
import type { TranslationKey } from '@/shared/lib/i18n'
import { useTranslation } from '@/shared/lib/useTranslation'
import { normalizeCabinetImageFile, validateCabinetImageFile } from './cabinetImageUpload'
import { readCabinetImageFile } from './readCabinetImageFile'

type UploadCabinetImage = (payload: {
    fileName: string
    mimeType: string
    size: number
    contentBase64: string
}) => Promise<{ url: string }>

const imageUploadErrorKeys: Record<string, TranslationKey> = {
    CABINET_IMAGE_UNSUPPORTED_TYPE: 'cabinet.imageUnsupportedType',
    CABINET_IMAGE_TOO_LARGE: 'cabinet.imageTooLarge',
    CABINET_IMAGE_INVALID_CONTENT: 'cabinet.imageInvalidContent',
}

export function useCabinetImageInput() {
    const { t } = useTranslation()
    const [imageError, setImageError] = useState<string | null>(null)
    const [selectedImage, setSelectedImage] = useState<File | null>(null)
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
    const imagePreviewUrl = useMemo(() => {
        if (!selectedImage) {
            return null
        }

        return URL.createObjectURL(selectedImage)
    }, [selectedImage])

    useEffect(() => {
        return () => {
            if (imagePreviewUrl) {
                URL.revokeObjectURL(imagePreviewUrl)
            }
        }
    }, [imagePreviewUrl])

    const getImageValidationMessage = (
        reason: 'unsupportedType' | 'tooLarge',
    ) => {
        if (reason === 'unsupportedType') {
            return t('cabinet.imageUnsupportedType')
        }

        return t('cabinet.imageTooLarge')
    }

    const handleImageChange = (file?: File) => {
        setImageError(null)
        setUploadedImageUrl(null)

        if (!file) {
            setSelectedImage(null)
            return
        }

        const validation = validateCabinetImageFile(file)

        if (!validation.isValid) {
            setSelectedImage(null)
            setImageError(getImageValidationMessage(validation.reason))
            return
        }

        setSelectedImage(file)
    }

    const clearImageError = () => {
        setImageError(null)
    }

    const uploadSelectedImage = async (uploadImage: UploadCabinetImage) => {
        if (uploadedImageUrl) {
            return { url: uploadedImageUrl }
        }

        if (!selectedImage) {
            return null
        }

        try {
            const normalizedImage = await normalizeCabinetImageFile(selectedImage)
            const contentBase64 = await readCabinetImageFile(normalizedImage)

            const uploadResult = await uploadImage({
                fileName: normalizedImage.name,
                mimeType: normalizedImage.type,
                size: normalizedImage.size,
                contentBase64,
            })

            setUploadedImageUrl(uploadResult.url)
            return uploadResult
        } catch (error) {
            const errorCode = getApiErrorCode(error)
            const errorKey = errorCode
                ? imageUploadErrorKeys[errorCode]
                : undefined
            const message = errorKey
                ? t(errorKey)
                : t('cabinet.imageUploadFailed')

            setImageError(message)
            throw new Error(message, {
                cause: error,
            })
        }
    }

    return {
        clearImageError,
        handleImageChange,
        imageError,
        imagePreviewUrl,
        hasUploadedImage: uploadedImageUrl !== null,
        uploadSelectedImage,
    }
}
