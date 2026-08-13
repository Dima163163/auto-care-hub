import { normalizeCabinetImageFile, validateCabinetImageFile } from '@/entities/cabinet/lib/cabinetImageUpload'
import { readCabinetImageFile } from '@/entities/cabinet/lib/readCabinetImageFile'

export async function prepareProviderLogo(file: File) {
    const validation = validateCabinetImageFile(file)
    if (!validation.isValid) throw new Error(validation.reason)
    const normalized = await normalizeCabinetImageFile(file)
    return {
        fileName: normalized.name,
        mimeType: normalized.type,
        size: normalized.size,
        contentBase64: await readCabinetImageFile(normalized),
    }
}
