# AutoCare location-zone catalog

The public home page reads location zones from `GET /api/v1/markets/:marketId/zones`.
The same contract is used by MSW, the Fastify API and the PostgreSQL seed, so a
new city can be added without changing the homepage component.

## Seeded launch markets

- **Moscow:** Central, North-West, South-West, East, North, North-East,
  South-East, South, West, Zelenograd, Troitsk and Novomoskovsky districts.
- **Samara:** Oktyabrsky, Leninsky, Promyshlenny, Kirovsky, Sovetsky,
  Zheleznodorozhny, Samarsky, Kuibyshevsky and Krasnoglinsky districts.
- **Kaliningrad:** Central, Moskovsky and Leningradsky districts. The city
  administration describes Kaliningrad as having these three administrative
  districts: [official city reference](https://www.klgd.ru/press/news/detail.php?ID=42179).
- **Saint Petersburg:** Central, Primorsky, Moskovsky, Vyborgsky, Petrogradsky,
  Nevsky, Kirovsky and Krasnogvardeysky districts. The API is ready for the
  complete set of 18 administrative districts when each receives service
  coverage; the city maintains the official district list
  [here](https://www.gov.spb.ru/helper/sod_fonda/giliwnjeotdelj/).
- **Transnistria:** Tiraspol (Central, Western, Kirovsky, October, Balka and
  Novotiraspolsky), plus Bender, Rybnitsa, Dubossary and Slobodzeya with
  central/north/south/east service areas. The regional government lists these
  cities and districts in its administrative overview
  [here](https://government.gospmr.org/vpervye-v-pridnestrove-sostoyalas-spartakiada-sredi-rabotnikov-gosudarstvennyh-administraczij-gorodov-i-rajonov-respubliki/).

Every zone stores localized names, center coordinates, radius, type and
display order. `serviceCount` is calculated by the backend from active service
locations in that zone; the seed deliberately does not invent provider counts
for cities that do not yet have registered services.

## API and UI behavior

- The homepage asks for `limit=4` to keep the compact discovery card aligned
  with the approved desktop design.
- The mock handler accepts both a market UUID-like id (`market-moscow`) and a
  city code (`moscow`), matching the Fastify `findMarket` behavior.
- The map/discovery flow can request a larger limit or nearest-zone ordering
  with latitude/longitude; no frontend data fixture is required.
- If a city has zones but no active providers, the card shows the district
  names with a zero count instead of the misleading “no zones” empty state.

## Adding another city

1. Add the market to `AUTOMOTIVE_MOCK_MARKETS` and the frontend mock market list.
2. Add canonical zones to `AUTOMOTIVE_MOCK_LOCATION_ZONES` and the equivalent
   MSW fixture.
3. Run `npm --prefix server run autocare:seed` against local PostgreSQL.
4. Verify `npm run check:api-parity`, the backend unit suite and the homepage
   at the new city code.
