import { OperationTimeoutError } from '../../shared/lifecycle/with-timeout.js'

export type MaintenanceErrorClass = 'timeout' | 'lease_lost' | 'dependency' | 'unknown'

export function classifyMaintenanceError(error: unknown): MaintenanceErrorClass {
    if (error instanceof OperationTimeoutError) return 'timeout'

    if (error instanceof Error && error.message.includes('Maintenance lease was lost')) {
        return 'lease_lost'
    }

    if (error instanceof Error) return 'dependency'
    return 'unknown'
}
