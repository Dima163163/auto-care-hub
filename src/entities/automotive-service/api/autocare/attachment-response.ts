/** Keep structured API denials so the shared privileged step-up flow can retry. */
export async function readAttachmentOrApiError(response: Response) {
    if (response.ok) return response.blob()
    return response.json().catch(() => null)
}
