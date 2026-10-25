import { fileURLToPath } from 'node:url'
import {
    resetEmailBindingBackfill,
    runIdentityEmailBindingBackfill,
    verifyIdentityEmailBindings,
    type EmailBindingTable,
} from '../shared/security/data-encryption/identity-email-binding-backfill.js'

type Mode = 'apply' | 'verify' | 'reset'

export function parseEmailBindingBackfillOptions(args: readonly string[]) {
    const values = new Map<string, string>()
    for (let index = 0; index < args.length; index += 2) {
        const flag = args[index]
        const value = args[index + 1]
        if (!flag || !['--table', '--mode', '--batch-size', '--max-batches'].includes(flag) || !value || values.has(flag)) {
            throw new Error('Use --table users|autocare_provider_invitations --mode apply|verify|reset [--batch-size 1..500] [--max-batches 1..10000].')
        }
        values.set(flag, value)
    }
    const table = values.get('--table')
    const mode = values.get('--mode')
    if (table !== 'users' && table !== 'autocare_provider_invitations') throw new Error('Invalid email binding table.')
    if (mode !== 'apply' && mode !== 'verify' && mode !== 'reset') throw new Error('Invalid email binding mode.')
    const batchSize = Number(values.get('--batch-size') ?? 100)
    const maxBatches = Number(values.get('--max-batches') ?? 100)
    if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 500
        || !Number.isSafeInteger(maxBatches) || maxBatches < 1 || maxBatches > 10_000) {
        throw new Error('Invalid email binding batch budget.')
    }
    return { table: table as EmailBindingTable, mode: mode as Mode, batchSize, maxBatches }
}

export async function runEmailBindingBackfill(options: ReturnType<typeof parseEmailBindingBackfillOptions>) {
    const { AppDataSource } = await import('../database/data-source.js')
    await AppDataSource.initialize()
    try {
        if (options.mode === 'reset') {
            await resetEmailBindingBackfill(AppDataSource, options.table)
            return { table: options.table, mode: options.mode, reset: true }
        }
        const result = options.mode === 'apply'
            ? await runIdentityEmailBindingBackfill(AppDataSource, options.table, options)
            : await verifyIdentityEmailBindings(AppDataSource, options.table, options)
        if (options.mode === 'verify' && !result.exhausted) {
            throw new Error('Email binding verification budget exhausted before all rows were checked.')
        }
        return { table: options.table, mode: options.mode, exhausted: result.exhausted, processed: result.checkpoint.processed }
    } finally {
        await AppDataSource.destroy()
    }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    try {
        const options = parseEmailBindingBackfillOptions(process.argv.slice(2))
        runEmailBindingBackfill(options).then((result) => {
            console.log(JSON.stringify(result))
        }).catch((error: unknown) => {
            console.error(error instanceof Error ? error.message : 'Email binding backfill failed.')
            process.exitCode = 1
        })
    } catch (error) {
        console.error(error instanceof Error ? error.message : 'Email binding options are invalid.')
        process.exitCode = 1
    }
}
