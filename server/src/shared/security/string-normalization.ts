export function stripControlCharacters(value: string) {
    return Array.from(value)
        .filter((character) => {
            const codePoint = character.codePointAt(0) ?? 0
            return codePoint > 31 && codePoint !== 127
        })
        .join('')
}

export function normalizeTextWhitespace(value: string) {
    return stripControlCharacters(value.replace(/[\t\n\r\f\v]/g, ' '))
}
