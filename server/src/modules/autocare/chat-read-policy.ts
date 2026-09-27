import { AutoCareChatThreadType } from '../../entities/automotive/service-request.entity.js'
import { UserRole } from '../../entities/user/user.entity.js'

export function shouldUpdateAutoCareChatReadReceipt(role: UserRole, type: AutoCareChatThreadType) {
    if (role !== UserRole.Admin && role !== UserRole.SuperAdmin) return true
    return type === AutoCareChatThreadType.Support || type === AutoCareChatThreadType.AdminEscalation
}
