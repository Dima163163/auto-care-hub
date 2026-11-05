const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ServiceRequestRecordScope = {
    clientId?: string
    providerId?: string
    locationId?: string
    definitionId?: string
}

export type ServiceRequestVehicleRecordScope = ServiceRequestRecordScope & { vehicleId?: string | null }

/** Authenticates the owner and service scope attached to a request snapshot. */
export function serviceRequestRecordContext(record: ServiceRequestRecordScope) {
    const values = [record.clientId, record.providerId, record.locationId, record.definitionId]
    if (values.some((value) => !value || !UUID.test(value))) {
        throw new Error('Encrypted service request scope is invalid.')
    }
    return JSON.stringify(values.map((value) => value!.toLowerCase()))
}

/** Vehicle snapshots also authenticate the optional vehicle selected for the request. */
export function serviceRequestVehicleRecordContext(record: ServiceRequestVehicleRecordScope) {
    if (record.vehicleId === undefined || (record.vehicleId !== null && !UUID.test(record.vehicleId))) {
        throw new Error('Encrypted service request vehicle scope is invalid.')
    }
    return JSON.stringify([serviceRequestRecordContext(record), record.vehicleId?.toLowerCase() ?? null])
}
