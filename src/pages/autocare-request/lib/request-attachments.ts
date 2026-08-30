import { validateImageUpload } from '@/shared/lib/media-upload'

export const MAX_REQUEST_ATTACHMENTS = 6

export interface RequestAttachmentSelection {
    files: File[]
    invalidCount: number
    tooManyCount: number
}

export function selectRequestImageFiles(files: File[]): RequestAttachmentSelection {
    let invalidCount = 0
    const supportedFiles = files.filter((file) => {
        if (validateImageUpload(file).isValid) return true

        invalidCount += 1
        return false
    })

    return {
        files: supportedFiles.slice(0, MAX_REQUEST_ATTACHMENTS),
        invalidCount,
        tooManyCount: Math.max(0, supportedFiles.length - MAX_REQUEST_ATTACHMENTS),
    }
}
