export type MailMode = 'logger' | 'smtp'
export type RuntimeEnvironment = 'development' | 'test' | 'production'

export function assertMailModeAllowed(nodeEnv: RuntimeEnvironment, mode: MailMode) {
    if (nodeEnv === 'production' && mode === 'logger') {
        throw new Error('MAIL_MODE=logger is not allowed in production.')
    }
}
