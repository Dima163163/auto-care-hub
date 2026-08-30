import { validateImageUpload, type SupportedImageMimeType } from '@/shared/lib/media-upload'

export type ChatAttachmentValidation =
    | { valid: true; contentType: SupportedImageMimeType }
    | { valid: false; reason: 'missing' | 'imageTooLarge' | 'imageTypeNotSupported' }

export function validateChatAttachment(file: File | undefined): ChatAttachmentValidation {
    if (!file) return { valid: false, reason: 'missing' }

    const validation = validateImageUpload(file)
    return validation.isValid
        ? { valid: true, contentType: validation.contentType }
        : { valid: false, reason: validation.reason }
}
