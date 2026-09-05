import { describe, expect, it } from 'vitest'

import { UserRole } from '../../entities/user/user.entity.js'
import {
    getMyAutoCareBonusAccounts,
    getOwnerAutoCareBonusLiability,
    getOwnerAutoCareBonusProgram,
    grantAutoCareBonus,
    redeemAutoCareBonus,
    upsertOwnerAutoCareBonusProgram,
} from './autocare-bonus.service.js'

const client = { id: '11111111-1111-4111-8111-111111111111', role: UserRole.Client } as never
const owner = { id: '22222222-2222-4222-8222-222222222222', role: UserRole.Owner } as never

describe('AutoCare bonus service boundaries', () => {
    it('keeps role checks ahead of bonus account reads', async () => {
        await expect(getMyAutoCareBonusAccounts(owner)).rejects.toMatchObject({ statusCode: 403 })
    })

    it('rejects malformed provider ids before owner program or liability reads', async () => {
        await expect(getOwnerAutoCareBonusProgram(owner, 'not-a-uuid')).rejects.toMatchObject({ statusCode: 422 })
        await expect(getOwnerAutoCareBonusLiability(owner, 'not-a-uuid')).rejects.toMatchObject({ statusCode: 422 })
    })

    it('rejects malformed owner program payloads before opening a transaction', async () => {
        await expect(upsertOwnerAutoCareBonusProgram(owner, 'not-a-uuid', null as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(upsertOwnerAutoCareBonusProgram(owner, '11111111-1111-4111-8111-111111111111', {
            name: 'x',
            earnPercent: 10,
            maxEarnPointsPerVisit: null,
            expiresAfterDays: null,
            active: true,
            extra: true,
        } as never)).rejects.toMatchObject({ statusCode: 422 })
    })

    it('rejects malformed redemption payloads before opening a transaction', async () => {
        await expect(redeemAutoCareBonus(client, null as never, null)).rejects.toMatchObject({ statusCode: 422 })
        await expect(redeemAutoCareBonus(client, {
            providerId: 'not-a-uuid',
            requestId: '22222222-2222-4222-8222-222222222222',
            points: 10,
        } as never, 'bonus-redemption-key')).rejects.toMatchObject({ statusCode: 422 })
    })

    it('keeps owner authorization and idempotency validation ahead of manual grant persistence', async () => {
        await expect(grantAutoCareBonus(client, null as never, null)).rejects.toMatchObject({ statusCode: 403 })
        await expect(grantAutoCareBonus(owner, null as never, null)).rejects.toMatchObject({ statusCode: 422 })
    })
})
