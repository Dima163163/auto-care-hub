import { AppDataSource } from '../database/data-source.js'
import {
    AccountDeletionRequestEntity,
    AccountDeletionRequestStatus,
} from '../entities/account-deletion-request/account-deletion-request.entity.js'
import { checkAutoCareDeletionInvariants } from '../modules/users/account-deletion-invariants.js'

async function run() {
    await AppDataSource.initialize()
    try {
        const limit = 1_000
        const completedRequests = await AppDataSource.getRepository(AccountDeletionRequestEntity)
            .createQueryBuilder('request')
            .select('request.userId', 'userId')
            .where('request.status = :status', { status: AccountDeletionRequestStatus.Completed })
            .orderBy('request.completedAt', 'DESC')
            .take(limit)
            .getRawMany<{ userId: string }>()

        const failures: Array<{ userId: string; names: string[] }> = []
        for (const { userId } of completedRequests) {
            const failed = (await checkAutoCareDeletionInvariants(AppDataSource, userId))
                .filter(({ count }) => count > 0)
            if (failed.length > 0) {
                failures.push({ userId, names: failed.map(({ name }) => name) })
            }
        }

        if (failures.length > 0) {
            throw new Error(`Account deletion retention rehearsal failed for ${failures.length} user(s).`)
        }
        console.log(`[account-deletion-retention] PASS: ${completedRequests.length} completed deletion(s) checked.`)
    } finally {
        await AppDataSource.destroy()
    }
}

run().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Account deletion retention rehearsal failed.')
    process.exitCode = 1
})
