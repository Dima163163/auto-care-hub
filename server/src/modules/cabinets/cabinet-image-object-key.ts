const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function getCabinetImageObjectNamespace(cabinetId: string) {
    if (!UUID_PATTERN.test(cabinetId)) {
        throw new Error('Invalid cabinet image namespace.')
    }

    return `cabinet/${cabinetId.toLowerCase()}`
}

export function getCabinetImageObjectKeyPrefix(cabinetId: string) {
    return `${getCabinetImageObjectNamespace(cabinetId)}/`
}
