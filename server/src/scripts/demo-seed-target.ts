import { env } from '../config/env.js'
import { AppDataSource } from '../database/data-source.js'
import { getDemoSeedTargetError } from './demo-seed-target-policy.js'

export async function withDemoSeedTarget(seed: () => Promise<void>) {
    const { host, name, port, url, username } = env.database
    const targetError = getDemoSeedTargetError({ nodeEnv: env.nodeEnv, host, name, port, url, username })
    if (targetError) throw new Error(targetError)

    await AppDataSource.initialize()
    try {
        const rows: Array<{ database_name: string }> = await AppDataSource.query(
            'SELECT current_database() AS database_name',
        )
        if (rows[0]?.database_name !== name) {
            throw new Error('Demo seeding refused because the connected database does not match the configured database.')
        }
        await seed()
    } finally {
        await AppDataSource.destroy()
    }
}
