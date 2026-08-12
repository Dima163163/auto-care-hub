import { Link } from 'react-router'
import { ROUTES } from '@/shared/constants/routes'
import { buttonVariants } from '@/components/ui/button-variants'
import { useTranslation } from '@/shared/lib/useTranslation'

export function LandingHeroContent() {
    const { t } = useTranslation()

    return (
        <div
            className="autocarehub-motion-fade-left flex flex-col min-[1260px]:items-start items-center min-[1260px]:text-left text-center"
        >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card/50 backdrop-blur-md px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary ring-1 ring-inset ring-primary/20">
                <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                </span>
                {t('landing.eyebrow')}
            </div>

            <h1 className="max-w-[42rem] text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl lg:leading-[1.1]">
                {t('landing.title')}
            </h1>

            <p className="mt-6 max-w-[38rem] text-lg leading-relaxed text-muted-foreground font-medium">
                {t('landing.description')}
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row justify-center min-[1260px]:justify-start">
                <Link
                    to={ROUTES.register}
                    className={buttonVariants({ 
                        size: 'lg', 
                        className: 'active:scale-95 transition-all duration-300 shadow-xl shadow-primary/20 hover:shadow-primary/30 rounded-xl h-14 px-8 text-base font-semibold' 
                    })}
                >
                    {t('auth.createAccount')}
                </Link>

                <Link
                    to={ROUTES.serviceDiscovery}
                    className={buttonVariants({ 
                        variant: 'outline', 
                        size: 'lg', 
                        className: 'active:scale-95 transition-all duration-300 bg-background/40 backdrop-blur-md rounded-xl h-14 px-8 border-2 border-primary/20 text-primary text-base font-semibold hover:bg-muted/60 hover:text-primary' 
                    })}
                >
                    {t('autocare.searchAction')}
                </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center min-[1260px]:justify-start gap-x-6 gap-y-3 text-sm font-medium text-muted-foreground">
                <div className="flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded-full border border-muted-foreground/30 text-xs">✓</span>
                    {t('landing.noCard')}
                </div>
                <div className="flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded-full border border-muted-foreground/30 text-xs">✓</span>
                    {t('landing.fastStart')}
                </div>
                <div className="flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded-full border border-muted-foreground/30 text-xs">✓</span>
                    {t('landing.noCommission')}
                </div>
            </div>
        </div>
    )
}
