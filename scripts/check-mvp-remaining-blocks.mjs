import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
export const REMAINING_BLOCKS_PATH = resolve(projectRoot, 'docs/operations/MVP_REMAINING_100_BLOCKS.md')

const blockHeadingPattern = /^## (BLOCK-\d+)[^\n]*$/gm
const taskPattern = /^\s*(\d+)\.\s+`\[([ x~E])\]`\s+/gm

export function parseRemainingMvpBlocks(source) {
    const headings = [...source.matchAll(blockHeadingPattern)]
    return headings.map((heading, index) => {
        const bodyStart = (heading.index ?? 0) + heading[0].length
        const bodyEnd = headings[index + 1]?.index ?? source.length
        const body = source.slice(bodyStart, bodyEnd)
        const tasks = [...body.matchAll(taskPattern)].map((match) => ({
            number: Number(match[1]),
            status: match[2] === ' ' ? '[ ]' : `[${match[2]}]`,
        }))
        return { id: heading[1], tasks }
    })
}

export function validateRemainingMvpBlocks(blocks, expectedBlockSize = 100) {
    const errors = []
    if (blocks.length === 0) errors.push('no BLOCK headings found')

    blocks.forEach((block) => {
        if (block.tasks.length !== expectedBlockSize) {
            errors.push(`${block.id} has ${block.tasks.length} tasks; expected ${expectedBlockSize}`)
        }
        block.tasks.forEach((task, index) => {
            if (task.number !== index + 1) errors.push(`${block.id} task ${index + 1} is numbered ${task.number}`)
            if (!['[ ]', '[x]', '[~]', '[E]'].includes(task.status)) {
                errors.push(`${block.id} task ${task.number} has invalid status ${task.status}`)
            }
        })
    })

    return errors
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const blocks = parseRemainingMvpBlocks(readFileSync(REMAINING_BLOCKS_PATH, 'utf8'))
    const errors = validateRemainingMvpBlocks(blocks)
    if (errors.length > 0) {
        console.error(['Remaining MVP block contract', ...errors.map((error) => `[BLOCKED] ${error}`)].join('\n'))
        process.exitCode = 1
    } else {
        console.log('Remaining MVP block contract')
        blocks.forEach((block) => {
            const counts = block.tasks.reduce((result, task) => {
                result[task.status] = (result[task.status] ?? 0) + 1
                return result
            }, {})
            console.log(`[PASS] ${block.id}: ${block.tasks.length} tasks (${Object.entries(counts).map(([status, count]) => `${status}=${count}`).join(', ')})`)
        })
    }
}
