import { Button } from '@/components/ui/button'
import { useTranslation } from '@/shared/lib/useTranslation'

type VerificationAlertProps = {
    isRequesting: boolean
    onResend: () => void
}

export function VerificationAlert({ isRequesting, onResend }: VerificationAlertProps) {
    const { t } = useTranslation()

    return (
        <div
            className="rounded-xl border border-status-warning-border bg-status-warning-surface p-6 shadow-sm"
            role="alert"
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h3 className="font-semibold text-status-warning-foreground">
                        {t('auth.unverifiedEmailTitle')}
                    </h3>
                    <p className="text-sm text-status-warning-foreground">
                        {t('auth.unverifiedEmailDescription')}
                    </p>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={onResend}
                    loading={isRequesting}
                    className="w-full shrink-0 border-status-warning-border bg-card hover:bg-status-warning-surface hover:text-status-warning-foreground sm:w-auto"
                >
                    {isRequesting
                        ? t('auth.resendEmailVerificationSending')
                        : t('auth.resendEmailVerification')}
                </Button>
            </div>
        </div>
    )
}
