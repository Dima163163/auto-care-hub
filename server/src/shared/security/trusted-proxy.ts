import { isIP } from 'node:net'

type IpFamily = 4 | 6

type ParsedIp = {
    family: IpFamily
    value: bigint
}

type IpRange = ParsedIp & {
    prefixLength: number
}

export type TrustedProxyConfig = {
    hops: number
    cidrs: string[]
}

export const MAX_TRUSTED_PROXY_HOPS = 8
export const MAX_TRUSTED_PROXY_CIDRS = 32

function parseIpv4(value: string): bigint {
    return value.split('.').reduce(
        (result, part) => result * 256n + BigInt(Number(part)),
        0n
    )
}

function parseIpv6(value: string): bigint {
    const compressionIndex = value.indexOf('::')
    const hasCompression = compressionIndex >= 0
    const left = hasCompression ? value.slice(0, compressionIndex) : value
    const right = hasCompression ? value.slice(compressionIndex + 2) : ''

    if (hasCompression && value.indexOf('::', compressionIndex + 2) >= 0) {
        throw new Error(`Invalid IPv6 address: ${value}`)
    }

    const parseGroups = (part: string) => {
        if (!part) return []

        return part.split(':').flatMap((group) => {
            if (!group) {
                throw new Error(`Invalid IPv6 address: ${value}`)
            }

            if (group.includes('.')) {
                if (isIP(group) !== 4) {
                    throw new Error(`Invalid embedded IPv4 address: ${group}`)
                }

                const ipv4 = parseIpv4(group)
                return [Number((ipv4 >> 16n) & 0xffffn), Number(ipv4 & 0xffffn)]
            }

            if (!/^[0-9a-fA-F]{1,4}$/.test(group)) {
                throw new Error(`Invalid IPv6 group: ${group}`)
            }

            return [Number.parseInt(group, 16)]
        })
    }

    const leftGroups = parseGroups(left)
    const rightGroups = parseGroups(right)
    const missingGroups = 8 - leftGroups.length - rightGroups.length
    const groups = hasCompression
        ? [...leftGroups, ...Array(missingGroups).fill(0), ...rightGroups]
        : [...leftGroups, ...rightGroups]

    if (groups.length !== 8 || (hasCompression && missingGroups < 1)) {
        throw new Error(`Invalid IPv6 address: ${value}`)
    }

    return groups.reduce((result, group) => result * 0x10000n + BigInt(group), 0n)
}

function parseIp(value: string): ParsedIp {
    const normalized = value.trim().replace(/^\[/, '').replace(/\]$/, '')
    const family = isIP(normalized)

    if (family === 4) {
        return {
            family: 4,
            value: parseIpv4(normalized),
        }
    }

    if (family === 6) {
        const ipv6Value = parseIpv6(normalized)

        if (ipv6Value >> 32n === 0xffffn) {
            return {
                family: 4,
                value: ipv6Value & 0xffffffffn,
            }
        }

        return {
            family: 6,
            value: ipv6Value,
        }
    }

    throw new Error(`Invalid IP address: ${value}`)
}

function parseCidr(value: string): IpRange {
    const parts = value.split('/')
    const address = parts[0]
    const prefix = parts[1]

    if (!address || parts.length > 2) {
        throw new Error(`Invalid CIDR: ${value}`)
    }

    if (prefix !== undefined && !/^\d+$/.test(prefix)) {
        throw new Error(`Invalid CIDR prefix: ${value}`)
    }

    const ip = parseIp(address)
    const maxPrefixLength = ip.family === 4 ? 32 : 128
    const prefixLength = prefix === undefined ? maxPrefixLength : Number(prefix)

    if (
        !Number.isInteger(prefixLength) ||
        prefixLength < 0 ||
        prefixLength > maxPrefixLength
    ) {
        throw new Error(`Invalid CIDR prefix: ${value}`)
    }

    return {
        ...ip,
        prefixLength,
    }
}

function isIpInRange(ip: ParsedIp, range: IpRange) {
    if (ip.family !== range.family) return false

    const bits = range.family === 4 ? 32n : 128n
    const mask = range.prefixLength === 0
        ? 0n
        : ((1n << bits) - 1n) ^ ((1n << (bits - BigInt(range.prefixLength))) - 1n)

    return (ip.value & mask) === (range.value & mask)
}

export function validateTrustedProxyCidrs(cidrs: string[]) {
    if (cidrs.length > MAX_TRUSTED_PROXY_CIDRS) {
        throw new Error(`Trusted proxy configuration supports at most ${MAX_TRUSTED_PROXY_CIDRS} CIDRs.`)
    }
    cidrs.forEach(parseCidr)
}

export function validateTrustedProxyConfig(config: TrustedProxyConfig) {
    if (!Number.isInteger(config.hops) || config.hops < 0 || config.hops > MAX_TRUSTED_PROXY_HOPS) {
        throw new Error(`Trusted proxy hops must be between 0 and ${MAX_TRUSTED_PROXY_HOPS}.`)
    }

    validateTrustedProxyCidrs(config.cidrs)
    return config
}

export function normalizeIpAddress(value: string) {
    try {
        const ip = parseIp(value)

        return `${ip.family}:${ip.value.toString(16).padStart(ip.family === 4 ? 8 : 32, '0')}`
    } catch {
        return undefined
    }
}

export function createTrustedProxyPolicy(config: TrustedProxyConfig) {
    const ranges = config.cidrs.map(parseCidr)

    return (address: string, hop: number) => {
        if (hop < 0 || hop >= config.hops) return false

        let ip: ParsedIp

        try {
            ip = parseIp(address)
        } catch {
            return false
        }

        return ranges.some((range) => isIpInRange(ip, range))
    }
}
