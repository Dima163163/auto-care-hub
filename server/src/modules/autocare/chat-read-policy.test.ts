import { describe, expect, it } from 'vitest'

import { AutoCareChatThreadType } from '../../entities/automotive/service-request.entity.js'
import { UserRole } from '../../entities/user/user.entity.js'
import { shouldUpdateAutoCareChatReadReceipt } from './chat-read-policy.js'

describe('AutoCare chat read receipts', () => {
    it('does not change participant read state during private moderation review', () => {
        expect(shouldUpdateAutoCareChatReadReceipt(UserRole.Admin, AutoCareChatThreadType.ServiceRequest)).toBe(false)
        expect(shouldUpdateAutoCareChatReadReceipt(UserRole.Admin, AutoCareChatThreadType.ProviderInquiry)).toBe(false)
        expect(shouldUpdateAutoCareChatReadReceipt(UserRole.SuperAdmin, AutoCareChatThreadType.ServiceRequest)).toBe(false)
    })

    it('keeps read receipts enabled for participants and operational support', () => {
        expect(shouldUpdateAutoCareChatReadReceipt(UserRole.Client, AutoCareChatThreadType.ServiceRequest)).toBe(true)
        expect(shouldUpdateAutoCareChatReadReceipt(UserRole.Admin, AutoCareChatThreadType.Support)).toBe(true)
        expect(shouldUpdateAutoCareChatReadReceipt(UserRole.SuperAdmin, AutoCareChatThreadType.AdminEscalation)).toBe(true)
    })
})
