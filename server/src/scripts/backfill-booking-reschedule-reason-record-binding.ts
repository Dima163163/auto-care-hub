import { fileURLToPath } from 'node:url'
import { resetBookingRescheduleReasonBindingBackfill, runBookingRescheduleReasonBindingBackfill, verifyBookingRescheduleReasonBindings } from '../shared/security/data-encryption/booking-reschedule-reason-binding-backfill.js'

type Mode = 'apply' | 'verify' | 'reset'

export function parseBookingRescheduleReasonBindingBackfillOptions(args: readonly string[]) {
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
    if (mode !== 'apply' && mode !== 'verify' && mode !== 'reset') throw new Error('Invalid booking reschedule reason binding mode.')
    const batchSize = Number(values.get('--batch-size') ?? 100)
    const maxBatches = Number(values.get('--max-batches') ?? 100)
    if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 500
        || !Number.isSafeInteger(maxBatches) || maxBatches < 1 || maxBatches > 10_000) {
        throw new Error('Invalid booking reschedule reason binding batch budget.')
    }
    return { mode: mode as Mode, batchSize, maxBatches }
}

export async function runBookingRescheduleReasonBindingCommand(options: ReturnType<typeof parseBookingRescheduleReasonBindingBackfillOptions>) {
    const { AppDataSource } = await import('../database/data-source.js')
    await AppDataSource.initialize()
    try {
        if (options.mode === 'reset') {
            await resetBookingRescheduleReasonBindingBackfill(AppDataSource)
            return { mode: options.mode, reset: true }
        }
        const result = options.mode === 'apply'
            ? await runBookingRescheduleReasonBindingBackfill(AppDataSource, options)
            : await verifyBookingRescheduleReasonBindings(AppDataSource, options)
        if (options.mode === 'verify' && !result.exhausted) {
            throw new Error('Booking reschedule reason binding verification budget exhausted before all rows were checked.')
        }
        return { mode: options.mode, exhausted: result.exhausted, processed: result.checkpoint.processed }
    } finally {
        await AppDataSource.destroy()
    }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    try {
        const options = parseBookingRescheduleReasonBindingBackfillOptions(process.argv.slice(2))
        runBookingRescheduleReasonBindingCommand(options).then((result) => {
            console.log(JSON.stringify(result))
        }).catch((error: unknown) => {
            console.error(error instanceof Error ? error.message : 'Booking reschedule reason binding backfill failed.')
            process.exitCode = 1
        })
    } catch (error) {
        console.error(error instanceof Error ? error.message : 'Booking reschedule reason binding options are invalid.')
        process.exitCode = 1
    }
}
