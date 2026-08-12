import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { useCreateAdminUserMutation } from '@/entities/user'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import type { TranslationKey, TranslationParams } from '@/shared/lib/i18n'
import { useTranslation } from '@/shared/lib/useTranslation'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/ui/dialog'

const createAdminSchema = (t: (key: TranslationKey, params?: TranslationParams) => string) =>
    z.object({
        name: z.string().min(2, t('auth.validation.nameMin', { count: 2 })),
        email: z.string().email(t('auth.validation.validEmail')),
    })

type AdminCreateFormValues = z.infer<ReturnType<typeof createAdminSchema>>

type AdminCreateDialogProps = {
    isOpen: boolean
    onClose: () => void
}

export function AdminCreateDialog({ isOpen, onClose }: AdminCreateDialogProps) {
    const { t } = useTranslation()
    const [createAdmin, { isLoading }] = useCreateAdminUserMutation()
    const [setupUrl, setSetupUrl] = useState<string | null>(null)

    const schema = createAdminSchema(t)
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<AdminCreateFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: '',
            email: '',
        },
    })

    const onSubmit = async (values: AdminCreateFormValues) => {
        try {
            const result = await createAdmin(values).unwrap()
            
            const url = new URL('/password/setup', window.location.origin)
            url.searchParams.set('token', result.passwordSetupToken)
            setSetupUrl(url.toString())
            
            toast.success(t('adminUsers.adminCreatedSuccessfully'))
            reset()
        } catch (error) {
            toast.error(
                getApiErrorMessage(
                    error,
                    t('adminUsers.adminCreateFailed')
                )
            )
        }
    }

    const handleClose = () => {
        setSetupUrl(null)
        reset()
        onClose()
    }

    return (
        <Dialog isOpen={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('adminUsers.createAdminTitle')}</DialogTitle>
                    <DialogDescription>
                        {t('adminUsers.createAdminDescription')}
                    </DialogDescription>
                </DialogHeader>

                {!setupUrl ? (
                    <form
                        id="create-admin-form"
                        onSubmit={handleSubmit(onSubmit)}
                        className="space-y-4 py-4"
                    >
                        <div className="space-y-2">
                            <label htmlFor="admin-name" className="text-sm font-medium">
                                {t('common.name')}
                            </label>
                            <input
                                id="admin-name"
                                className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
                                {...register('name')}
                            />
                            {errors.name && (
                                <p className="text-xs text-destructive">{errors.name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="admin-email" className="text-sm font-medium">
                                {t('common.email')}
                            </label>
                            <input
                                id="admin-email"
                                type="email"
                                className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
                                {...register('email')}
                            />
                            {errors.email && (
                                <p className="text-xs text-destructive">{errors.email.message}</p>
                            )}
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4 py-4">
                        <div className="rounded-xl bg-muted p-4">
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                {t('adminUsers.setupUrlLabel')}
                            </p>
                            <p className="mt-2 break-all text-sm font-mono">
                                {setupUrl}
                            </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('adminUsers.setupUrlDescription')}
                        </p>
                    </div>
                )}

                <DialogFooter className="sm:justify-between">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleClose}
                    >
                        {t('common.close')}
                    </Button>
                    {!setupUrl && (
                        <Button
                            type="submit"
                            form="create-admin-form"
                            loading={isLoading}
                        >
                            {isLoading ? t('common.saving') : t('common.create')}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
