# Catalog Map Provider

The desktop public catalog uses Leaflet `1.9.x` with CARTO Positron raster
basemap tiles. CARTO is used as the current basemap endpoint because the
OpenStreetMap standard tile endpoint is best-effort and may reject application
traffic without an approved usage profile.

## Current contract

- Tile URL: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`.
- Visible attribution: OpenStreetMap contributors and CARTO.
- The map is interactive: pan, scroll zoom, zoom controls, cabinet price
  labels, list-to-map selection, map-to-list selection, and an explicit current
  location action.
- Current location is requested only after the user presses the location
  control. Coordinates are used in memory to center the map and are not sent
  to the API, persisted, logged, or added to analytics.
- The public catalog shows an approximate city area. Cabinet addresses are not
  geocoded in the browser and are not exposed as precise map coordinates.
- A selected cabinet can be opened in OpenStreetMap externally or on its own
  cabinet details route.

## Production gate

CARTO's public basemap endpoint is a working development and early-production
baseline, not a guarantee of commercial SLA. Before high-volume launch, select
an account-backed or self-hosted provider with documented quotas, uptime,
regional coverage, billing, cache policy, attribution, and key rotation. Keep
the tile URL behind a configuration boundary so the provider can be changed
without rewriting the catalog UI.

The exact cabinet coordinate model remains a separate backend task. It should
store provider-verified coordinates, preserve approximate public display, and
expose precise routing coordinates only on the confirmed booking flow after an
explicit directions action.

References:

- Leaflet quick start: https://leafletjs.com/examples/quick-start/
- OpenStreetMap tile policy: https://operations.osmfoundation.org/policies/tiles/
- CARTO basemap documentation: https://docs.carto.com/carto-user-manual/maps/basemaps
