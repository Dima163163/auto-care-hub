import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const requiredSourceFragments = [
    "openapi: '3.1.0'",
    "title: 'AutoCare Hub API'",
    "security: [{ bearerAuth: [] }]",
    "securitySchemes:",
    "bearerAuth:",
    "responses:",
    "schemas:",
    "ErrorResponse:",
]

const requiredOperations = [
    ['GET', '/health/live', 'getHealthLive'],
    ['GET', '/health/ready', 'getHealthReady'],
    ['GET', '/cabinets', 'listPublicCabinets'],
    ['GET', '/bookings/my', 'listMyBookings'],
    ['GET', '/owner/bookings', 'listOwnerBookings'],
    ['GET', '/notifications', 'listNotifications'],
    ['GET', '/admin/users', 'listAdminUsers'],
    ['GET', '/admin/account-deletion-requests', 'listAdminAccountDeletionRequests'],
    ['PATCH', '/admin/account-deletion-requests/{id}/status', 'updateAdminAccountDeletionRequestStatus'],
    ['GET', '/admin/audit-logs', 'listAdminAuditLogs'],
    ['GET', '/admin/audit-logs/export', 'exportAdminAuditLogs'],
    ['GET', '/admin/system-incidents', 'listAdminSystemIncidents'],
    ['GET', '/users/me/export', 'exportMyData'],
    ['GET', '/users/me/deletion-request', 'getMyDeletionRequest'],
    ['POST', '/users/me/deletion-request', 'requestAccountDeletion'],
    ['DELETE', '/users/me/deletion-request', 'cancelAccountDeletion'],
    ['POST', '/v1/autocare-appeals', 'createAutoCareAppeal'],
    ['GET', '/v1/autocare-appeals/my', 'listMyAutoCareAppeals'],
    ['GET', '/admin/autocare-appeals', 'listAdminAutoCareAppeals'],
    ['PATCH', '/admin/autocare-appeals/{id}/decision', 'decideAdminAutoCareAppeal'],
]

function quote(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function validateOpenApiSource(source) {
    const missingFragments = requiredSourceFragments.filter((fragment) => !source.includes(fragment))
    if (missingFragments.length > 0) {
        throw new Error(`OpenAPI source is missing required fragments: ${missingFragments.join(', ')}`)
    }

    const missingOperations = requiredOperations.filter(([method, path, operationId]) => {
        const pathPattern = new RegExp(`['"]${quote(path)}['"]\\s*:\\s*\\{[\\s\\S]{0,2000}\\b${method.toLowerCase()}\\s*:`)
        return !pathPattern.test(source) || !source.includes(`operationId: '${operationId}'`)
    })

    if (missingOperations.length > 0) {
        const formatted = missingOperations.map(([method, path]) => `${method} ${path}`)
        throw new Error(`OpenAPI source is missing required operations: ${formatted.join(', ')}`)
    }

    return { operations: requiredOperations.length }
}

async function main() {
    const source = await readFile('server/src/routes/openapi.route.ts', 'utf8')
    const result = validateOpenApiSource(source)
    console.log(`OpenAPI shape check passed for ${result.operations} operations.`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    await main()
}
