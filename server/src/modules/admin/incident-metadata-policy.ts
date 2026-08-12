export const MAX_INCIDENT_METADATA_KEYS = 64

export function assertIncidentMetadataKeyCount(metadata: Record<string, unknown>) {
    if (Object.keys(metadata).length > MAX_INCIDENT_METADATA_KEYS) {
        throw new Error('System incident metadata has too many keys.')
    }
    return metadata
}
