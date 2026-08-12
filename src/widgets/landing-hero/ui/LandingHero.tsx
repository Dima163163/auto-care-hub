import { LandingHeroContent } from './LandingHeroContent'
import { LandingHeroMockCard } from './LandingHeroMockCard'
import { MobileHero } from './MobileHero'

export function LandingHero() {
    return (
        <section className="relative overflow-hidden bg-background">
            {/* Animated Background */}
            <div aria-hidden="true" className="autocarehub-motion-hero-background absolute inset-0 z-0 pointer-events-none">
                <div
                    className="autocarehub-motion-hero-orb-primary absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-primary/10 blur-[100px]"
                />
                <div
                    className="autocarehub-motion-hero-orb-secondary absolute -right-40 -bottom-40 h-[30rem] w-[30rem] rounded-full bg-secondary/20 blur-[100px]"
                />
            </div>

            <div className="relative z-10 mx-auto max-w-7xl px-4 lg:px-8">
                <MobileHero />
                <div className="hidden md:grid min-h-[calc(100vh-4rem)] items-center gap-[30px] py-16 min-[1260px]:grid-cols-[0.9fr_1.1fr] grid-cols-1">
                    <div className="flex flex-col justify-center">
                        <LandingHeroContent />
                    </div>
                    <div className="flex items-center justify-center w-full max-w-[900px] mx-auto">
                        <LandingHeroMockCard />
                    </div>
                </div>
            </div>
        </section>
    )
}
