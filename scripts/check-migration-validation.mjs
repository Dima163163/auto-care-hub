import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))

function check(name, status, detail) {
    return { name, status, detail }
}

function stripComments(source) {
    return String(source)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
}

function getUpMigrationSource(source) {
    // Rollback SQL is never executed by the forward release gate. Excluding
    // the down method prevents a rollback-only re-add from looking like a
    // second live constraint in the forward migration history.
    return stripComments(source).replace(/\b(?:public\s+)?async\s+down\s*\([\s\S]*$/i, '')
}

function collectConstraintLifecycleIssues(migrationSources) {
    const activeNames = new Set()
    const duplicateNames = []
    const addPattern = /ADD\s+CONSTRAINT\s+"([^\"]+)"[^;`]*?\bNOT\s+VALID\b/gi
    const dropPattern = /DROP\s+CONSTRAINT(?:\s+IF\s+EXISTS)?\s+"([^\"]+)"/gi

    for (const source of Object.values(migrationSources)) {
        const upSource = getUpMigrationSource(source)
        const events = []

        for (const match of upSource.matchAll(addPattern)) {
            events.push({ index: match.index ?? 0, kind: 'add', name: match[1] })
        }
        for (const match of upSource.matchAll(dropPattern)) {
            events.push({ index: match.index ?? 0, kind: 'drop', name: match[1] })
        }

        events.sort((left, right) => left.index - right.index)
        for (const event of events) {
            if (event.kind === 'drop') {
                activeNames.delete(event.name)
                continue
            }

            if (activeNames.has(event.name)) duplicateNames.push(event.name)
            activeNames.add(event.name)
        }
    }

    return duplicateNames
}

/**
 * Finds constraints intentionally added with PostgreSQL's NOT VALID option.
 * Comments are removed first so the inventory describes executable migration
 * SQL rather than explanatory prose.
 */
export function collectNotValidConstraints(migrationSources) {
    const constraints = []
    const pattern = /ADD\s+CONSTRAINT\s+"([^\"]+)"[^;`]*?\bNOT\s+VALID\b/gi

    for (const [fileName, source] of Object.entries(migrationSources)) {
        const withoutComments = stripComments(source)
        for (const match of withoutComments.matchAll(pattern)) {
            constraints.push({ fileName, constraintName: match[1] })
        }
    }

    return constraints
}

export function evaluateMigrationValidation({ migrationSources, integritySource, packageSource, releaseChecklistSource }) {
    const constraints = collectNotValidConstraints(migrationSources)
    const names = new Set(constraints.map(({ constraintName }) => constraintName))
    const duplicateNames = collectConstraintLifecycleIssues(migrationSources)

    const results = [
        constraints.length > 0
            ? check('NOT VALID migration inventory', 'pass', `${constraints.length} executable constraints require post-deploy validation`)
            : check('NOT VALID migration inventory', 'blocked', 'no executable NOT VALID constraints were found; inspect the migration source or checker contract'),
        integritySource.includes('NOT constraint_row.convalidated') && integritySource.includes('relation.relname LIKE \'autocare_%\'')
            ? check('Database validation query', 'pass', 'release checker discovers every unvalidated AutoCare foreign-key/check constraint from pg_constraint')
            : check('Database validation query', 'blocked', 'check-autocare-integrity must query pg_constraint.convalidated for AutoCare constraints'),
        integritySource.includes("process.argv.includes('--validate')") && integritySource.includes('VALIDATE CONSTRAINT')
            ? check('Validation execution path', 'pass', 'the checker promotes discovered constraints with ALTER TABLE ... VALIDATE CONSTRAINT')
            : check('Validation execution path', 'blocked', 'check-autocare-integrity must expose an explicit --validate execution path'),
        packageSource.includes('check:autocare-integrity -- --validate')
            ? check('Release migration gate', 'pass', 'release:migrate runs integrity validation after migrations')
            : check('Release migration gate', 'blocked', 'server release:migrate must invoke check:autocare-integrity -- --validate'),
        releaseChecklistSource.includes('check:autocare-integrity -- --validate') && releaseChecklistSource.includes('from `NOT VALID`')
            ? check('Release checklist evidence', 'pass', 'the release checklist records when NOT VALID constraints are promoted')
            : check('Release checklist evidence', 'blocked', 'release checklist must require the --validate command and NOT VALID promotion evidence'),
        duplicateNames.length === 0
            ? check('Constraint name uniqueness', 'pass', `${names.size} unique constraint names found in migrations`)
            : check('Constraint name uniqueness', 'blocked', `duplicate NOT VALID constraint names: ${[...new Set(duplicateNames)].join(', ')}`),
    ]

    return { constraints, results }
}

export function loadMigrationValidationSources(root = PROJECT_ROOT) {
    const migrationDirectory = resolve(root, 'server/src/database/migrations')
    const migrationSources = Object.fromEntries(
        readdirSync(migrationDirectory, { withFileTypes: true })
            .filter((entry) => entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts'))
            .sort((left, right) => left.name.localeCompare(right.name))
            .map((entry) => [entry.name, readFileSync(resolve(migrationDirectory, entry.name), 'utf8')]),
    )

    return {
        migrationSources,
        integritySource: readFileSync(resolve(root, 'server/src/scripts/check-autocare-integrity.ts'), 'utf8'),
        packageSource: readFileSync(resolve(root, 'server/package.json'), 'utf8'),
        releaseChecklistSource: readFileSync(resolve(root, 'docs/RELEASE_CHECKLIST.md'), 'utf8'),
    }
}

export function formatMigrationValidationResults({ constraints, results }) {
    const lines = [`Migration validation contract (${constraints.length} NOT VALID constraints)`]
    for (const result of results) {
        lines.push(`[${result.status.toUpperCase()}] ${result.name}: ${result.detail}`)
    }
    return lines.join('\n')
}

async function main() {
    const evaluation = evaluateMigrationValidation(loadMigrationValidationSources())
    console.log(formatMigrationValidationResults(evaluation))
    if (evaluation.results.some((result) => result.status === 'blocked')) process.exitCode = 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
