import { createHash } from 'node:crypto'

export function getCabinetImageChecksum(content: Buffer) {
    return createHash('sha256').update(content).digest('hex')
}
