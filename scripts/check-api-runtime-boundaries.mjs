import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'

const root = process.cwd()
const sourceRoots = [path.join(root, 'src/entities'), path.join(root, 'src/features')]
const autoCareFacade = path.join(root, 'src/entities/automotive-service/api/autocareApi.ts')
const failures = []

async function collectFiles(directory, predicate) {
    const entries = await readdir(directory, { withFileTypes: true })
    const files = []
    for (const entry of entries) {
        const entryPath = path.join(directory, entry.name)
        if (entry.isDirectory()) files.push(...await collectFiles(entryPath, predicate))
        else if (predicate(entry.name)) files.push(entryPath)
    }
    return files
}

function visit(node, callback) {
    callback(node)
    ts.forEachChild(node, (child) => visit(child, callback))
}

function parse(filePath, source) {
    return ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
}

function unwrap(node) {
    while (node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node))) {
        node = node.expression
    }
    return node
}

function getObjectProperty(object, name) {
    return object.properties.find((property) =>
        (ts.isPropertyAssignment(property) || ts.isMethodDeclaration(property))
        && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
        && property.name.text === name,
    )
}

function endpointCalls(ast) {
    const endpoints = []
    visit(ast, (node) => {
        if (!ts.isPropertyAssignment(node) || !ts.isCallExpression(node.initializer)) return
        const call = node.initializer
        if (!ts.isPropertyAccessExpression(call.expression)) return
        if (!ts.isIdentifier(call.expression.expression)) return
        if (!['query', 'mutation'].includes(call.expression.name.text)) return
        const name = node.name.getText(ast).replaceAll(/['"]/g, '')
        endpoints.push({ name, call, line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1 })
    })
    return endpoints
}

function registeredFactories(ast, filePath) {
    const imports = new Map()
    for (const statement of ast.statements) {
        if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue
        const bindings = statement.importClause?.namedBindings
        if (!bindings || !ts.isNamedImports(bindings)) continue
        for (const binding of bindings.elements) {
            imports.set(binding.name.text, path.resolve(path.dirname(filePath), `${statement.moduleSpecifier.text}.ts`))
        }
    }
    const factories = new Set()
    visit(ast, (node) => {
        if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression) || node.expression.name.text !== 'injectEndpoints') return
        const config = unwrap(node.arguments[0])
        if (!config || !ts.isObjectLiteralExpression(config)) return
        const endpoints = getObjectProperty(config, 'endpoints')
        if (!endpoints || !ts.isPropertyAssignment(endpoints)) return
        const initializer = unwrap(endpoints.initializer)
        if (!initializer || !ts.isArrowFunction(initializer)) return
        const body = unwrap(initializer.body)
        if (!body || !ts.isObjectLiteralExpression(body)) return
        for (const property of body.properties) {
            if (!ts.isSpreadAssignment(property) || !ts.isCallExpression(property.expression)) continue
            const callee = property.expression.expression
            if (!ts.isIdentifier(callee)) continue
            const imported = imports.get(callee.text)
            if (imported?.endsWith('.endpoints.ts')) factories.add(imported)
        }
    })
    return factories
}

const apiFiles = (await Promise.all(sourceRoots.map((directory) => collectFiles(directory, (name) => name.endsWith('Api.ts') && name !== 'baseApi.ts')))).flat().sort()
const factoryFiles = new Set((await Promise.all(sourceRoots.map((directory) => collectFiles(directory, (name) => name.endsWith('.endpoints.ts'))))).flat())
const registered = new Set()
const filesToCheck = new Map()

for (const filePath of apiFiles) {
    const ast = parse(filePath, await readFile(filePath, 'utf8'))
    const factories = registeredFactories(ast, filePath)
    for (const factory of factories) registered.add(factory)
    filesToCheck.set(filePath, { ast, isFactory: false, factories })
}

if (!apiFiles.includes(autoCareFacade) || !(filesToCheck.get(autoCareFacade)?.factories.size)) {
    failures.push('autocareApi.ts has no registered domain endpoint factories')
}
for (const filePath of registered) {
    if (!factoryFiles.has(filePath)) failures.push(`${path.relative(root, filePath)} is registered but missing`)
}
for (const filePath of factoryFiles) {
    if (!registered.has(filePath)) failures.push(`${path.relative(root, filePath)} is an unregistered domain endpoint factory`)
}
for (const filePath of registered) {
    if (!factoryFiles.has(filePath)) continue
    filesToCheck.set(filePath, { ast: parse(filePath, await readFile(filePath, 'utf8')), isFactory: true, factories: new Set() })
}

let endpointCount = 0
let domainEndpointCount = 0
for (const [filePath, { ast, isFactory, factories }] of filesToCheck) {
    const endpoints = endpointCalls(ast)
    if (endpoints.length === 0 && (isFactory || factories.size === 0)) {
        failures.push(`${path.relative(root, filePath)} has zero checked endpoints`)
    }
    endpointCount += endpoints.length
    if (isFactory) domainEndpointCount += endpoints.length
    for (const endpoint of endpoints) {
        const definition = unwrap(endpoint.call.arguments[0])
        if (!definition || !ts.isObjectLiteralExpression(definition) || !getObjectProperty(definition, 'transformResponse')) {
            failures.push(`${path.relative(root, filePath)}:${endpoint.line} ${endpoint.name} has no transformResponse`)
        }
    }
}
if (endpointCount === 0 || domainEndpointCount === 0) failures.push('unexpected zero endpoint coverage')

if (failures.length > 0) {
    console.error('Frontend API runtime-boundary contract failed:')
    for (const failure of failures) console.error(`- ${failure}`)
    process.exitCode = 1
} else {
    console.info(`Frontend API runtime-boundary contract passed (${endpointCount} endpoints, ${domainEndpointCount} domain endpoints across ${registered.size} factories and ${apiFiles.length} API modules).`)
}
