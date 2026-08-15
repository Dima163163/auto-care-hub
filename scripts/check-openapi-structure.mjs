import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const REQUIRED_OPERATIONS = [
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
    ['GET', '/admin/security-events', 'listAdminSecurityEvents'],
    ['GET', '/users/me/export', 'exportMyData'],
    ['GET', '/users/me/deletion-request', 'getMyDeletionRequest'],
    ['POST', '/users/me/deletion-request', 'requestAccountDeletion'],
    ['DELETE', '/users/me/deletion-request', 'cancelAccountDeletion'],
]

function unwrap(expression) {
    let current = expression
    while (
        ts.isAsExpression(current) ||
        ts.isTypeAssertionExpression(current) ||
        ts.isParenthesizedExpression(current) ||
        ts.isSatisfiesExpression(current)
    ) {
        current = current.expression
    }
    return current
}

function getProperty(object, name) {
    const property = object.properties.find((candidate) => {
        if (!ts.isPropertyAssignment(candidate) && !ts.isMethodDeclaration(candidate)) return false
        const propertyName = candidate.name
        return Boolean(propertyName && propertyName.getText().replace(/^['"]|['"]$/g, '') === name)
    })

    if (!property || !ts.isPropertyAssignment(property)) {
        throw new Error(`OpenAPI object is missing property ${name}.`)
    }

    return unwrap(property.initializer)
}

function getObject(expression, label) {
    const object = unwrap(expression)
    if (!ts.isObjectLiteralExpression(object)) {
        throw new Error(`OpenAPI ${label} must be an object literal.`)
    }
    return object
}

function getString(expression, label) {
    const value = unwrap(expression)
    if (!ts.isStringLiteral(value) && !ts.isNoSubstitutionTemplateLiteral(value)) {
        throw new Error(`OpenAPI ${label} must be a string literal.`)
    }
    return value.text
}

function getArray(expression, label) {
    const value = unwrap(expression)
    if (!ts.isArrayLiteralExpression(value)) {
        throw new Error(`OpenAPI ${label} must be an array literal.`)
    }
    return value.elements
}

function getDocumentObject(source) {
    const sourceFile = ts.createSourceFile(
        'openapi.route.ts',
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
    )
    const declaration = sourceFile.statements.find(
        (statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === 'getOpenApiDocument',
    )

    if (!declaration || !declaration.body) {
        throw new Error('OpenAPI source must export getOpenApiDocument.')
    }

    const returnStatement = declaration.body.statements.find(ts.isReturnStatement)
    if (!returnStatement?.expression) {
        throw new Error('getOpenApiDocument must return an OpenAPI document.')
    }

    return getObject(returnStatement.expression, 'document')
}

export function validateOpenApiStructure(source) {
    const document = getDocumentObject(source)
    if (getString(getProperty(document, 'openapi'), 'version') !== '3.1.0') {
        throw new Error('OpenAPI version must be 3.1.0.')
    }

    const security = getArray(getProperty(document, 'security'), 'security')
    const firstSecurity = getObject(security[0], 'security requirement')
    getArray(getProperty(firstSecurity, 'bearerAuth'), 'bearerAuth security requirement')

    const components = getObject(getProperty(document, 'components'), 'components')
    const securitySchemes = getObject(getProperty(components, 'securitySchemes'), 'securitySchemes')
    const bearerAuth = getObject(getProperty(securitySchemes, 'bearerAuth'), 'bearerAuth')
    if (getString(getProperty(bearerAuth, 'type'), 'bearerAuth type') !== 'http') {
        throw new Error('bearerAuth must use HTTP security.')
    }
    if (getString(getProperty(bearerAuth, 'scheme'), 'bearerAuth scheme') !== 'bearer') {
        throw new Error('bearerAuth must use the bearer scheme.')
    }

    const schemas = getObject(getProperty(components, 'schemas'), 'schemas')
    const errorResponse = getObject(getProperty(schemas, 'ErrorResponse'), 'ErrorResponse')
    const requiredFields = getArray(getProperty(errorResponse, 'required'), 'ErrorResponse.required')
        .map((field) => getString(field, 'ErrorResponse.required field'))
    if (!requiredFields.includes('requestId')) {
        throw new Error('ErrorResponse must require requestId.')
    }

    const paths = getObject(getProperty(document, 'paths'), 'paths')
    for (const [method, path, operationId] of REQUIRED_OPERATIONS) {
        const pathObject = getObject(getProperty(paths, path), `path ${path}`)
        const operation = getObject(getProperty(pathObject, method.toLowerCase()), `${method} ${path}`)
        if (getString(getProperty(operation, 'operationId'), `${method} ${path} operationId`) !== operationId) {
            throw new Error(`OpenAPI operation id mismatch for ${method} ${path}.`)
        }
    }

    return { operations: REQUIRED_OPERATIONS.length }
}

async function main() {
    const source = await readFile('server/src/routes/openapi.route.ts', 'utf8')
    const result = validateOpenApiStructure(source)
    console.log(`OpenAPI structural check passed for ${result.operations} operations.`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    await main()
}
