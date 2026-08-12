import path from 'node:path'

export const DEFAULT_CABINET_UPLOADS_DIR = 'uploads/cabinets'

export function resolveCabinetUploadsDir(value: string | undefined, cwd = process.cwd()) {
    return path.resolve(cwd, value?.trim() || DEFAULT_CABINET_UPLOADS_DIR)
}
