import { fileURLToPath } from 'node:url'
import { resetUserProfileBindingBackfill, runUserProfileBindingBackfill, verifyUserProfileBindings } from '../shared/security/data-encryption/user-profile-binding-backfill.js'

type Mode = 'apply' | 'verify' | 'reset'

export function parseUserProfileBindingBackfillOptions(args: readonly string[]) {
    const values = new Map<string, string>()
    for (let index = 0; index < args.length; index += 2) {
        const flag = args[index]
        const value = args[index + 1]
        if (!flag || !['--mode', '--batch-size', '--max-batches'].includes(flag) || !value || values.has(flag)) {
            throw new Error('Use --mode apply|verify|reset [--batch-size 1..500] [--max-batches 1..10000].')
        }
        values.set(flag, value)
    }
    const mode = values.get('--mode')
    if (mode !== 'apply' && mode !== 'verify' && mode !== 'reset') throw new Error('Invalid user profile binding mode.')
    const batchSize = Number(values.get('--batch-size') ?? 100)
    const maxBatches = Number(values.get('--max-batches') ?? 100)
    if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 500
        || !Number.isSafeInteger(maxBatches) || maxBatches < 1 || maxBatches > 10_000) {
        throw new Error('Invalid user profile binding batch budget.')
    }
    return { mode: mode as Mode, batchSize, maxBatches }
}

export async function runUserProfileBindingCommand(options: ReturnType<typeof parseUserProfileBindingBackfillOptions>) {
    const { AppDataSource } = await import('../database/data-source.js')
    await AppDataSource.initialize()
    try {
        if (options.mode === 'reset') {
            await resetUserProfileBindingBackfill(AppDataSource)
            return { mode: options.mode, reset: true }
        }
        const result = options.mode === 'apply'
            ? await runUserProfileBindingBackfill(AppDataSource, options)
            : await verifyUserProfileBindings(AppDataSource, options)
        if (options.mode === 'verify' && !result.exhausted) {
            throw new Error('User profile binding verification budget exhausted before all rows were checked.')
        }
        return { mode: options.mode, exhausted: result.exhausted, processed: result.checkpoint.processed }
    } finally {
        await AppDataSource.destroy()
    }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    try {
        const options = parseUserProfileBindingBackfillOptions(process.argv.slice(2))
        runUserProfileBindingCommand(options).then((result) => {
            console.log(JSON.stringify(result))
        }).catch((error: unknown) => {
            console.error(error instanceof Error ? error.message : 'User profile binding backfill failed.')
            process.exitCode = 1
        })
    } catch (error) {
        console.error(error instanceof Error ? error.message : 'User profile binding options are invalid.')
        process.exitCode = 1
    }
}
