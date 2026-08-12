import { connectDatabase, disconnectDatabaseGracefully } from '../database/database.js'
import { getSchemaContractStatus } from '../database/schema-contract.js'
import { createSchemaContractCheckResult } from '../database/schema-contract-diagnostics.js'

async function main() {
    try {
        await connectDatabase()
        const status = await getSchemaContractStatus()
        const result = createSchemaContractCheckResult(status)

        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
        process.exitCode = result.ok ? 0 : 1
    } catch {
        process.stderr.write('Schema contract check failed: database is unavailable or configuration is invalid.\n')
        process.exitCode = 1
    } finally {
        await disconnectDatabaseGracefully()
    }
}

void main()

