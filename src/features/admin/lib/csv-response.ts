/** Preserve structured API errors so the shared MFA step-up retry can run. */
export async function readCsvOrApiError(response: Response) {
    if (response.ok) return response.blob()
    return response.json().catch(() => null)
}
