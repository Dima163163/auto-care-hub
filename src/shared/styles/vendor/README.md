# Vendored static stylesheet

`shadcn-tailwind.css` is the byte-identical `dist/tailwind.css` from the previously
locked `shadcn@4.21.0` (MIT, LICENSE retained). SHA-256: `bc7d83425702955b4cb67cb14ede9d603f9d912376d57a2d81d661094d2a782a`.

The app imports this stylesheet but does not invoke the CLI. Keeping the inert
CSS preserves all existing theme utilities/variants without retaining the unused
CLI dependency graph (and vulnerable glob parser chain). Updates require a
reviewed source/version/license and a visual regression check; do not edit vendor
CSS during unrelated feature work. No style/design changes were made here.
