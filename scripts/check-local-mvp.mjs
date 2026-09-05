import { execFileSync, spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(new URL('..', import.meta.url).pathname)
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
export const DEFAULT_COMMAND_TIMEOUT_MS = 10 * 60 * 1000
export const MAX_COMMAND_TIMEOUT_MS = 15 * 60 * 1000

export function getCommandTimeoutMs(environment = process.env) {
    const configured = Number(environment.LOCAL_MVP_COMMAND_TIMEOUT_MS ?? DEFAULT_COMMAND_TIMEOUT_MS)
    if (!Number.isSafeInteger(configured) || configured < 1_000 || configured > MAX_COMMAND_TIMEOUT_MS) {
        throw new Error(`LOCAL_MVP_COMMAND_TIMEOUT_MS must be an integer between 1000 and ${MAX_COMMAND_TIMEOUT_MS}.`)
    }
    return configured
}

/**
 * The order is intentional: compile and static checks run before the optional
 * release-server browser pass. Every command is executed without a shell so
 * arguments cannot be interpreted as executable input.
 */
export const LOCAL_MVP_CHECKS = [
    { id: 'frontend-lint', label: 'Frontend lint', executable: npmCommand, args: ['run', 'lint', '--', '--max-warnings=0'] },
    { id: 'frontend-tests', label: 'Frontend tests', executable: npmCommand, args: ['test', '--', '--run'] },
    { id: 'next-build', label: 'Next production build', executable: npmCommand, args: ['run', 'build'] },
    { id: 'backend-build', label: 'Backend TypeScript build', executable: npmCommand, args: ['--prefix', 'server', 'run', 'build'] },
    { id: 'api-parity', label: 'Mock/API parity', executable: npmCommand, args: ['run', 'check:api-parity'] },
    { id: 'staging-api-contract', label: 'Staging API compatibility contract', executable: npmCommand, args: ['run', 'check:staging-api'] },
    { id: 'staging-api-tests', label: 'Staging API compatibility regressions', executable: npmCommand, args: ['run', 'test:staging-api'] },
    { id: 'media-pipeline-contract', label: 'Media pipeline contract', executable: npmCommand, args: ['run', 'check:media-pipeline'] },
    { id: 'media-pipeline-tests', label: 'Media pipeline regressions', executable: npmCommand, args: ['run', 'test:media-pipeline'] },
    { id: 'backup-restore-contract', label: 'Backup/restore contract', executable: npmCommand, args: ['run', 'check:backup-restore'] },
    { id: 'backup-restore-tests', label: 'Backup/restore regressions', executable: npmCommand, args: ['run', 'test:backup-restore'] },
    { id: 'mvp-interaction-contract', label: 'MVP keyboard/accessibility contract', executable: npmCommand, args: ['run', 'check:mvp-interaction'] },
    { id: 'mvp-interaction-tests', label: 'MVP keyboard/accessibility regressions', executable: npmCommand, args: ['run', 'test:mvp-interaction'] },
    { id: 'redis-rate-limit-contract', label: 'Redis fail-closed contract', executable: npmCommand, args: ['run', 'check:redis-rate-limit'] },
    { id: 'redis-rate-limit-tests', label: 'Redis fail-closed regressions', executable: npmCommand, args: ['run', 'test:redis-rate-limit'] },
    { id: 'concurrency-matrix-contract', label: 'Transition concurrency contract', executable: npmCommand, args: ['run', 'check:concurrency-matrix'] },
    { id: 'concurrency-matrix-tests', label: 'Transition concurrency regressions', executable: npmCommand, args: ['run', 'test:concurrency-matrix'] },
    { id: 'route-snapshot', label: 'Mock/backend route snapshot', executable: npmCommand, args: ['run', 'check:route-snapshot'] },
    { id: 'route-snapshot-tests', label: 'Mock/backend route snapshot regressions', executable: npmCommand, args: ['run', 'test:route-snapshot'] },
    { id: 'route-inventory', label: 'Next route inventory', executable: npmCommand, args: ['run', 'check:next-route-inventory'] },
    { id: 'route-inventory-tests', label: 'Next route inventory regressions', executable: npmCommand, args: ['run', 'test:next-route-inventory'] },
    { id: 'route-contract', label: 'Next route contract', executable: npmCommand, args: ['run', 'check:next-route-contract'] },
    { id: 'legacy-cleanup', label: 'Legacy cleanup manifest', executable: npmCommand, args: ['run', 'check:legacy-cleanup'] },
    { id: 'legacy-file-classification', label: 'Legacy file classification', executable: npmCommand, args: ['run', 'check:legacy-files'] },
    { id: 'no-bookly-runtime', label: 'Legacy runtime guard', executable: npmCommand, args: ['run', 'check:no-bookly-runtime'] },
    { id: 'no-legacy-provider', label: 'Legacy payment guard', executable: npmCommand, args: ['run', 'check:no-legacy-provider'] },
    { id: 'threat-surface', label: 'Threat surface contract', executable: npmCommand, args: ['run', 'check:threat-surface'] },
    { id: 'owner-route-auth', label: 'Owner route auth contract', executable: npmCommand, args: ['run', 'check:owner-route-auth'] },
    { id: 'migration-validation', label: 'Migration validation contract', executable: npmCommand, args: ['run', 'check:migration-validation'] },
    { id: 'loading-shell', label: 'Loading shell contract', executable: npmCommand, args: ['run', 'check:loading-shell'] },
    { id: 'state-matrix', label: 'UI state matrix contract', executable: npmCommand, args: ['run', 'check:state-matrix'] },
    { id: 'client-path', label: 'Client path contract', executable: npmCommand, args: ['run', 'check:client-path'] },
    { id: 'design-tokens', label: 'Design token contract', executable: npmCommand, args: ['run', 'check:design-tokens'] },
    { id: 'interaction-contract', label: 'Interaction-state contract', executable: npmCommand, args: ['run', 'check:interaction-contract'] },
    { id: 'discovery-form-contract', label: 'Discovery form contract', executable: npmCommand, args: ['run', 'check:discovery-form'] },
    { id: 'discovery-form-tests', label: 'Discovery form regressions', executable: npmCommand, args: ['run', 'test:discovery-form'] },
    { id: 'seo-contract', label: 'SEO, prerender and media budgets', executable: npmCommand, args: ['run', 'check:seo'] },
    { id: 'seo-tests', label: 'SEO contract regressions', executable: npmCommand, args: ['run', 'test:seo'] },
    { id: 'responsive-contract', label: 'Responsive browser matrix', executable: npmCommand, args: ['run', 'check:responsive'], runtime: true },
    { id: 'chromium', label: 'Chromium executable', executable: npmCommand, args: ['run', 'check:e2e:browser'] },
    { id: 'git-diff-check', label: 'Whitespace / patch check', executable: 'git', args: ['diff', '--check'] },
]

export function redactEvidence(value) {
    return String(value ?? '')
        .replace(/(password|secret|token|authorization|cookie)\s*[:=]\s*([^\s,;]+)/gi, '$1=[REDACTED]')
        .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL]')
}

function tailEvidence(stdout, stderr) {
    const combined = [stdout, stderr]
        .filter(Boolean)
        .join('\n')
        .split('\n')
        .map((line) => line.trimEnd())
        .filter(Boolean)
    return redactEvidence(combined.slice(-8).join('\n'))
}

function runCommand(spec, env = process.env) {
    const startedAt = Date.now()
    try {
        const stdout = execFileSync(spec.executable, spec.args, {
            cwd: projectRoot,
            env,
            encoding: 'utf8',
            timeout: getCommandTimeoutMs(env),
            maxBuffer: 32 * 1024 * 1024,
            stdio: ['ignore', 'pipe', 'pipe'],
        })
        return {
            id: spec.id,
            label: spec.label,
            status: 'pass',
            durationMs: Date.now() - startedAt,
            evidence: tailEvidence(stdout, ''),
        }
    } catch (error) {
        return {
            id: spec.id,
            label: spec.label,
            status: 'blocked',
            durationMs: Date.now() - startedAt,
            exitCode: typeof error?.status === 'number' ? error.status : null,
            evidence: tailEvidence(error?.stdout?.toString(), error?.stderr?.toString() || error?.message),
        }
    }
}

function findFreePort() {
    return new Promise((resolvePort, reject) => {
        const server = createServer()
        server.once('error', reject)
        server.listen(0, '127.0.0.1', () => {
            const address = server.address()
            const port = typeof address === 'object' && address ? address.port : null
            server.close((closeError) => {
                if (closeError) reject(closeError)
                else if (!port) reject(new Error('OS did not allocate a local port'))
                else resolvePort(port)
            })
        })
    })
}

async function waitForHttp(url, child, timeoutMs = 30_000) {
    const deadline = Date.now() + timeoutMs
    let lastError = 'server did not respond'
    while (Date.now() < deadline) {
        if (child.exitCode !== null) throw new Error(`Next release server exited with code ${child.exitCode}`)
        try {
            const response = await fetch(url)
            if (response.status < 500) return
            lastError = `HTTP ${response.status}`
        } catch (error) {
            lastError = error instanceof Error ? error.message : String(error)
        }
        await new Promise((resolveWait) => setTimeout(resolveWait, 300))
    }
    throw new Error(`Next release server was not ready: ${lastError}`)
}

async function runRuntimeChecks(baseEnvironment) {
    let port
    try {
        port = await findFreePort()
    } catch (error) {
        return {
            id: 'responsive-contract',
            label: 'Responsive browser matrix',
            status: 'manual',
            durationMs: 0,
            evidence: `Cannot allocate a local test port: ${redactEvidence(error instanceof Error ? error.message : String(error))}`,
        }
    }

    const baseUrl = `http://127.0.0.1:${port}`
    const child = spawn(npmCommand, ['run', 'start', '--', '--hostname', '127.0.0.1', '--port', String(port)], {
        cwd: projectRoot,
        env: { ...baseEnvironment, PORT: String(port) },
        stdio: ['ignore', 'pipe', 'pipe'],
    })
    const output = []
    child.stdout?.on('data', (chunk) => output.push(chunk.toString()))
    child.stderr?.on('data', (chunk) => output.push(chunk.toString()))

    try {
        await waitForHttp(`${baseUrl}/`, child)
        return runCommand(
            { ...LOCAL_MVP_CHECKS.find((check) => check.id === 'responsive-contract'), runtime: undefined },
            { ...baseEnvironment, RESPONSIVE_BASE_URL: baseUrl },
        )
    } catch (error) {
        return {
            id: 'responsive-contract',
            label: 'Responsive browser matrix',
            status: 'manual',
            durationMs: 0,
            evidence: tailEvidence(output.join(''), error instanceof Error ? error.message : String(error)),
        }
    } finally {
        if (child.exitCode === null) {
            child.kill('SIGTERM')
            await new Promise((resolveExit) => {
                const timer = setTimeout(resolveExit, 5_000)
                child.once('exit', () => {
                    clearTimeout(timer)
                    resolveExit()
                })
            })
        }
    }
}

function getCommitSha(env = process.env) {
    try {
        return execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], { cwd: projectRoot, env, encoding: 'utf8' }).trim()
    } catch {
        return 'unavailable'
    }
}

export async function runLocalMvpGate({
    dryRun = false,
    includeRuntime = true,
    environment = process.env,
} = {}) {
    const results = []
    for (const check of LOCAL_MVP_CHECKS) {
        if (check.runtime) continue
        results.push(dryRun
            ? { id: check.id, label: check.label, status: 'planned', evidence: `${check.executable} ${check.args.join(' ')}` }
            : runCommand(check, environment))
    }

    if (includeRuntime) {
        results.push(dryRun
            ? { id: 'responsive-contract', label: 'Responsive browser matrix', status: 'planned', evidence: 'start Next release server on an ephemeral loopback port' }
            : await runRuntimeChecks(environment))
    } else {
        results.push({
            id: 'responsive-contract',
            label: 'Responsive browser matrix',
            status: 'manual',
            evidence: 'Run without --static-only after a successful Next build to include the ephemeral release-server browser pass.',
        })
    }

    return {
        commitSha: getCommitSha(environment),
        generatedAt: new Date().toISOString(),
        results,
        counts: results.reduce((counts, result) => {
            counts[result.status] = (counts[result.status] ?? 0) + 1
            return counts
        }, {}),
    }
}

export function formatLocalMvpGate(report) {
    const lines = ['AutoCare Hub local MVP quality gate']
    lines.push(`Commit: ${report.commitSha}`)
    for (const result of report.results) {
        const duration = result.durationMs ? ` (${(result.durationMs / 1000).toFixed(1)}s)` : ''
        lines.push(`[${result.status.toUpperCase()}] ${result.label}${duration}`)
        if (result.status !== 'pass' && result.evidence) lines.push(`  ${result.evidence.replace(/\n/g, '\n  ')}`)
    }
    const blocked = report.counts.blocked ?? 0
    const manual = report.counts.manual ?? 0
    const planned = report.counts.planned ?? 0
    lines.push(blocked > 0
        ? `Result: blocked by ${blocked} check(s); ${manual} manual gate(s), ${planned} planned.`
        : planned > 0
            ? `Result: dry run; ${planned} check(s) planned, ${manual} manual gate(s) intentionally skipped.`
        : manual > 0
            ? `Result: incomplete; ${manual} manual gate(s) remain, ${planned} planned.`
                : 'Result: all local MVP checks passed.')
    return lines.join('\n')
}

export async function writeLocalMvpJsonArtifact(report, outputPath) {
    if (!outputPath) return
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
}

async function main() {
    const rawArgs = process.argv.slice(2)
    const args = new Set(rawArgs)
    const report = await runLocalMvpGate({
        dryRun: args.has('--dry-run'),
        includeRuntime: !args.has('--static-only') && !args.has('--dry-run'),
    })
    if (args.has('--json')) console.log(JSON.stringify(report, null, 2))
    else console.log(formatLocalMvpGate(report))

    const outputIndex = rawArgs.indexOf('--json-file')
    if (outputIndex >= 0) {
        const outputPath = rawArgs[outputIndex + 1]
        if (!outputPath || outputPath.startsWith('--')) throw new Error('--json-file requires a file path.')
        await writeLocalMvpJsonArtifact(report, outputPath)
    }

    if (!args.has('--dry-run') && ((report.counts.blocked ?? 0) > 0 || (report.counts.manual ?? 0) > 0)) process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
