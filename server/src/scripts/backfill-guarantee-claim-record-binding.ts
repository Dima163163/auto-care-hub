import { fileURLToPath } from 'node:url'
import { resetGuaranteeClaimBindingBackfill, runGuaranteeClaimBindingBackfill, verifyGuaranteeClaimBindings } from '../shared/security/data-encryption/guarantee-claim-binding-backfill.js'

type Mode = 'apply' | 'verify' | 'reset'

export function parseGuaranteeClaimBindingBackfillOptions(args: readonly string[]) {
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
    if (mode !== 'apply' && mode !== 'verify' && mode !== 'reset') throw new Error('Invalid guarantee claim binding mode.')
    const batchSize = Number(values.get('--batch-size') ?? 100)
    const maxBatches = Number(values.get('--max-batches') ?? 100)
    if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 500
        || !Number.isSafeInteger(maxBatches) || maxBatches < 1 || maxBatches > 10_000) {
        throw new Error('Invalid guarantee claim binding batch budget.')
    }
    return { mode: mode as Mode, batchSize, maxBatches }
}

export async function runGuaranteeClaimBindingCommand(options: ReturnType<typeof parseGuaranteeClaimBindingBackfillOptions>) {
    const { AppDataSource } = await import('../database/data-source.js')
    await AppDataSource.initialize()
    try {
        if (options.mode === 'reset') {
            await resetGuaranteeClaimBindingBackfill(AppDataSource)
            return { mode: options.mode, reset: true }
        }
        const result = options.mode === 'apply'
            ? await runGuaranteeClaimBindingBackfill(AppDataSource, options)
            : await verifyGuaranteeClaimBindings(AppDataSource, options)
        if (options.mode === 'verify' && !result.exhausted) {
            throw new Error('Guarantee claim binding verification budget exhausted before all rows were checked.')
        }
        return { mode: options.mode, exhausted: result.exhausted, processed: result.checkpoint.processed }
    } finally {
        await AppDataSource.destroy()
    }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    try {
        const options = parseGuaranteeClaimBindingBackfillOptions(process.argv.slice(2))
        runGuaranteeClaimBindingCommand(options).then((result) => {
            console.log(JSON.stringify(result))
        }).catch((error: unknown) => {
            console.error(error instanceof Error ? error.message : 'Guarantee claim binding backfill failed.')
            process.exitCode = 1
        })
    } catch (error) {
        console.error(error instanceof Error ? error.message : 'Guarantee claim binding options are invalid.')
        process.exitCode = 1
    }
}
