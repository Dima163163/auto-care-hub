import { type ClientVehicle } from "@/entities/user/model/vehicles"
import { mockVehiclesByUser } from './mock-fixtures'

export function getMockVehicles(userId: string) {
    const vehicles = mockVehiclesByUser.get(userId)
    if (vehicles) return vehicles

    const next: ClientVehicle[] = []
    mockVehiclesByUser.set(userId, next)
    return next
}
