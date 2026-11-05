import { fileURLToPath } from 'node:url'
import { resetBroadcastOfferBindingBackfill, runBroadcastOfferBindingBackfill, verifyBroadcastOfferBindings } from '../shared/security/data-encryption/broadcast-offer-binding-backfill.js'

type Mode = 'apply' | 'verify' | 'reset'

export function parseBroadcastOfferBindingBackfillOptions(args: readonly string[]) {
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
    if (mode !== 'apply' && mode !== 'verify' && mode !== 'reset') throw new Error('Invalid broadcast offer binding mode.')
    const batchSize = Number(values.get('--batch-size') ?? 100)
    const maxBatches = Number(values.get('--max-batches') ?? 100)
    if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 500
        || !Number.isSafeInteger(maxBatches) || maxBatches < 1 || maxBatches > 10_000) {
        throw new Error('Invalid broadcast offer binding batch budget.')
    }
    return { mode: mode as Mode, batchSize, maxBatches }
}

export async function runBroadcastOfferBindingCommand(options: ReturnType<typeof parseBroadcastOfferBindingBackfillOptions>) {
    const { AppDataSource } = await import('../database/data-source.js')
    await AppDataSource.initialize()
    try {
        if (options.mode === 'reset') {
            await resetBroadcastOfferBindingBackfill(AppDataSource)
            return { mode: options.mode, reset: true }
        }
        const result = options.mode === 'apply'
            ? await runBroadcastOfferBindingBackfill(AppDataSource, options)
            : await verifyBroadcastOfferBindings(AppDataSource, options)
        if (options.mode === 'verify' && !result.exhausted) {
            throw new Error('Broadcast offer binding verification budget exhausted before all rows were checked.')
        }
        return { mode: options.mode, exhausted: result.exhausted, processed: result.checkpoint.processed }
    } finally {
        await AppDataSource.destroy()
    }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    try {
        const options = parseBroadcastOfferBindingBackfillOptions(process.argv.slice(2))
        runBroadcastOfferBindingCommand(options).then((result) => {
            console.log(JSON.stringify(result))
        }).catch((error: unknown) => {
            console.error(error instanceof Error ? error.message : 'Broadcast offer binding backfill failed.')
            process.exitCode = 1
        })
    } catch (error) {
        console.error(error instanceof Error ? error.message : 'Broadcast offer binding options are invalid.')
        process.exitCode = 1
    }
}
