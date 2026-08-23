# Archived translation monoliths

`popular.monolith.ts` and `ru.monolith.ts` were the pre-launch translation bundles.
They are retained for audit/history only and are not part of the application build.
The runtime now loads one locale at a time from `src/shared/config/translations/popular-*.ts`
and the Russian locale from `ru-part-*.ts` to keep route and locale payloads bounded.
