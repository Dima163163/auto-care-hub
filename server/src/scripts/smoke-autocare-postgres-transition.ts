import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { Client } from 'pg'

import { env } from '../config/env.js'

const [, , mode, stateTable, barrierTable, workerId] = process.argv
const workerCount = 2
const timeoutMs = 10_000

export type PostgresTransitionWorkerResult = 'committed' | 'conflict'

export type PostgresTransitionSmokeReport = {
    schemaVersion: 1
    status: 'pass'
    processCount: number
    committedCount: number
    conflictCount: number
    finalState: 'committed'
}

export function summarizePostgresTransitionResults(
    results: readonly PostgresTransitionWorkerResult[],
    finalState: string,
): PostgresTransitionSmokeReport {
    const committedCount = results.filter((result) => result === 'committed').length
    const conflictCount = results.filter((result) => result === 'conflict').length

    if (results.length !== workerCount || committedCount !== 1 || conflictCount !== 1 || finalState !== 'committed') {
        throw new Error('PostgreSQL transition smoke did not produce exactly one committed winner and one conflict.')
    }

    return {
        schemaVersion: 1,
        status: 'pass',
        processCount: results.length,
        committedCount,
        conflictCount,
        finalState: 'committed',
    }
}

function quoteIdentifier(identifier: string) {
    if (!/^autocare_transition_smoke_[a-f0-9]{32}(?:_state|_barrier)$/.test(identifier)) {
        throw new Error('PostgreSQL transition smoke received an invalid table identifier.')
    }
    return `"${identifier}"`
}

function createClient() {
    return new Client(env.database.url
        ? { connectionString: env.database.url }
        : {
            host: env.database.host,
            port: env.database.port,
            user: env.database.username,
            password: env.database.password,
            database: env.database.name,
        })
}

function sleep(milliseconds: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
}

function parseWorkerResult(line: string): PostgresTransitionWorkerResult {
    const result = line.slice('RESULT:'.length)
    if (result !== 'committed' && result !== 'conflict') throw new Error('PostgreSQL transition worker returned an invalid result.')
    return result
}

async function waitForAllWorkers(client: Client, barrierTableName: string) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
        const result = await client.query<{ count: string }>(`SELECT count(*)::text AS count FROM ${quoteIdentifier(barrierTableName)}`)
        if (Number(result.rows[0]?.count) === workerCount) return
        await sleep(25)
    }
    throw new Error('PostgreSQL transition workers did not reach the barrier.')
}

async function runWorker() {
    if (!stateTable || !barrierTable || !workerId) throw new Error('PostgreSQL transition worker arguments are incomplete.')

    const client = createClient()
    const stateTableName = quoteIdentifier(stateTable)
    const barrierTableName = quoteIdentifier(barrierTable)
    await client.connect()
    try {
        await client.query(`INSERT INTO ${barrierTableName} (worker_id) VALUES ($1) ON CONFLICT (worker_id) DO NOTHING`, [workerId])
        await waitForAllWorkers(client, barrierTable)
        await client.query('BEGIN')
        try {
            const current = await client.query<{ state: string }>(`SELECT state FROM ${stateTableName} WHERE id = 1 FOR UPDATE`)
            await client.query('SELECT pg_sleep(0.05)')
            if (current.rows[0]?.state === 'pending') {
                await client.query(`UPDATE ${stateTableName} SET state = 'committed', winner = $1 WHERE id = 1`, [workerId])
                await client.query('COMMIT')
                process.stdout.write('RESULT:committed\n')
            } else {
                await client.query('COMMIT')
                process.stdout.write('RESULT:conflict\n')
            }
        } catch (error) {
            await client.query('ROLLBACK').catch(() => undefined)
            throw error
        }
    } finally {
        await client.end()
    }
}

function spawnWorker(stateTableName: string, barrierTableName: string, id: string) {
    const scriptPath = fileURLToPath(import.meta.url)
    const scriptArgs = scriptPath.endsWith('.ts')
        ? ['--import', 'tsx', scriptPath, 'worker', stateTableName, barrierTableName, id]
        : [scriptPath, 'worker', stateTableName, barrierTableName, id]
    const child = spawn(process.execPath, scriptArgs, {
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
    })

    return new Promise<PostgresTransitionWorkerResult>((resolve, reject) => {
        let stdout = ''
        let stderr = ''
        let settled = false
        const timeout = setTimeout(() => {
            if (!child.killed) child.kill('SIGTERM')
            settle(() => reject(new Error(`PostgreSQL transition worker timed out. ${stderr}`)))
        }, timeoutMs)

        const settle = (callback: () => void) => {
            if (settled) return
            settled = true
            clearTimeout(timeout)
            callback()
        }

        child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
        child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
        child.once('error', () => settle(() => reject(new Error('PostgreSQL transition worker could not start.'))))
        child.once('exit', (code, signal) => settle(() => {
            if (code !== 0) {
                reject(new Error(`PostgreSQL transition worker exited unexpectedly (${code ?? signal ?? 'unknown'}). ${stderr}`))
                return
            }
            const resultLine = stdout.split('\n').find((line) => line.startsWith('RESULT:'))
            if (!resultLine) {
                reject(new Error('PostgreSQL transition worker produced no result.'))
                return
            }
            try {
                resolve(parseWorkerResult(resultLine))
            } catch (error) {
                reject(error)
            }
        }))
    })
}

async function runCoordinator() {
    const token = randomUUID().replaceAll('-', '')
    const stateTableName = `autocare_transition_smoke_${token}_state`
    const barrierTableName = `autocare_transition_smoke_${token}_barrier`
    const client = createClient()
    const quotedStateTable = quoteIdentifier(stateTableName)
    const quotedBarrierTable = quoteIdentifier(barrierTableName)
    await client.connect()
    try {
        await client.query(`CREATE TABLE ${quotedStateTable} (id integer PRIMARY KEY, state text NOT NULL, winner text NULL)`)
        await client.query(`CREATE TABLE ${quotedBarrierTable} (worker_id text PRIMARY KEY)`)
        await client.query(`INSERT INTO ${quotedStateTable} (id, state) VALUES (1, 'pending')`)
        const results = await Promise.all([
            spawnWorker(stateTableName, barrierTableName, 'worker-a'),
            spawnWorker(stateTableName, barrierTableName, 'worker-b'),
        ])
        const finalState = await client.query<{ state: string }>(`SELECT state FROM ${quotedStateTable} WHERE id = 1`)
        console.log(JSON.stringify(summarizePostgresTransitionResults(results, finalState.rows[0]?.state ?? 'missing')))
    } finally {
        await client.query(`DROP TABLE IF EXISTS ${quotedBarrierTable}`)
        await client.query(`DROP TABLE IF EXISTS ${quotedStateTable}`)
        await client.end()
    }
}

async function main() {
    if (mode === 'worker') await runWorker()
    else await runCoordinator()
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    void main().catch((error: unknown) => {
        process.stderr.write(`${error instanceof Error ? error.message : 'PostgreSQL transition smoke check failed.'}\n`)
        process.exitCode = 1
    })
}
