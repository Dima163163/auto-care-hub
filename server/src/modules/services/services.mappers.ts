import type { ServiceEntity } from '../../entities/service/service.entity.js'
import type { PublicService } from './services.types.js'

export function toPublicService(service: ServiceEntity): PublicService {
    return {
        id: service.id,
        cabinetId: service.cabinetId,
        title: service.title,
        description: service.description,
        durationMinutes: service.durationMinutes,
        price: service.price,
        isActive: service.isActive,
    }
}