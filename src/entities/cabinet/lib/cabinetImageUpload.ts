export const CABINET_IMAGE_MAX_SIZE_BYTES = 1024 * 1024

export const CABINET_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'

export const CABINET_IMAGE_ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
] as const

type CabinetImageValidationResult =
    | {
        isValid: true
    }
    | {
        isValid: false
        reason: 'unsupportedType' | 'tooLarge'
    }

type CabinetImageFileMetadata = {
    size: number
    type: string
}

export function validateCabinetImageFile(
    file: CabinetImageFileMetadata,
): CabinetImageValidationResult {
    if (!CABINET_IMAGE_ALLOWED_TYPES.includes(
        file.type as (typeof CABINET_IMAGE_ALLOWED_TYPES)[number],
    )) {
        return {
            isValid: false,
            reason: 'unsupportedType',
        }
    }

    return {
        isValid: true,
    }
}

export async function normalizeCabinetImageFile(file: File) {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)

    try {
        await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve()
            image.onerror = () => reject(new Error('Unable to read image'))
            image.src = objectUrl
        })

        const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)

        let quality = 0.84
        let blob: Blob | null = null

        while (quality >= 0.45) {
            blob = await new Promise<Blob | null>((resolve) =>
                canvas.toBlob(resolve, 'image/webp', quality),
            )

            if (blob && blob.size <= CABINET_IMAGE_MAX_SIZE_BYTES) {
                break
            }

            quality -= 0.1
        }

        if (!blob || blob.size > CABINET_IMAGE_MAX_SIZE_BYTES) {
            throw new Error('Image could not be compressed')
        }

        return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, {
            type: 'image/webp',
        })
    } finally {
        URL.revokeObjectURL(objectUrl)
    }
}
