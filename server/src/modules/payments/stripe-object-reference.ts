export function assertStripeObjectReference(input: {
    objectId: unknown
    referencedId: unknown
    label?: string
}) {
    const objectId = typeof input.objectId === 'string' ? input.objectId.trim() : ''
    const referencedId = typeof input.referencedId === 'string' ? input.referencedId.trim() : ''

    if (!objectId || !referencedId || objectId !== referencedId) {
        throw new Error(`${input.label ?? 'Stripe object'} reference does not match.`)
    }

    return objectId
}
