export function readCabinetImageFile(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()

        reader.addEventListener('load', () => {
            if (typeof reader.result !== 'string') {
                reject(new Error('Failed to read cabinet image.'))
                return
            }

            const [, contentBase64 = ''] = reader.result.split(',')

            resolve(contentBase64)
        })

        reader.addEventListener('error', () => {
            reject(new Error('Failed to read cabinet image.'))
        })

        reader.readAsDataURL(file)
    })
}
