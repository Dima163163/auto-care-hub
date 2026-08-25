import { describe, expect, it, vi } from 'vitest'

import { CreateAutoCareBonusLedger1786070000000 } from './migrations/1786070000000-CreateAutoCareBonusLedger.js'

describe('AutoCare bonus ledger migration', () => {
    it('creates provider-scoped accounts, typed entries and replay-safe constraints', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new CreateAutoCareBonusLedger1786070000000().up({ query } as never)

        const statements = query.mock.calls.map(([sql]) => String(sql))
        expect(statements.some((sql) => sql.includes('autocare_bonus_programs'))).toBe(true)
        expect(statements.some((sql) => sql.includes('UQ_autocare_bonus_accounts_client_provider'))).toBe(true)
        expect(statements.some((sql) => sql.includes('UQ_autocare_bonus_ledger_account_key'))).toBe(true)
        expect(statements.some((sql) => sql.includes('CHK_autocare_bonus_ledger_nonzero'))).toBe(true)
        expect(statements.some((sql) => sql.includes('CHK_autocare_bonus_accounts_balance'))).toBe(true)
    })

    it('drops the complete bonus domain in dependency order', async () => {
        const query = vi.fn().mockResolvedValue(undefined)

        await new CreateAutoCareBonusLedger1786070000000().down({ query } as never)

        expect(query.mock.calls.map(([sql]) => String(sql))).toEqual([
            'DROP INDEX "public"."IDX_autocare_bonus_ledger_account_created"',
            'DROP TABLE "autocare_bonus_ledger"',
            'DROP TABLE "autocare_bonus_accounts"',
            'DROP TABLE "autocare_bonus_programs"',
            'DROP TYPE "public"."autocare_bonus_ledger_type"',
        ])
    })
})
