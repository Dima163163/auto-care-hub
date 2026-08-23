# Production geo-search strategy

AutoCare Hub currently runs on the stock `postgres:17-alpine` image. The
discovery endpoint therefore uses a portable two-stage strategy:

1. SQL narrows candidates by `marketId`, optional `zoneId`, and an indexed
   latitude/longitude bounding box (`1786120000000-AddAutoCareGeoIndexes`).
2. The API applies the exact great-circle approximation and the requested
   radius before price, brand, trust and availability filters.

This keeps distance filtering out of an unbounded in-memory scan and preserves
the cursor/keyset contract. A PostGIS deployment can replace only the query
stage with `ST_DWithin(geography(Point(...)))`; the response, cursor and
ranking contracts remain unchanged. The rollout must include an explain-plan
check and a backfill validation for null coordinates before enabling PostGIS.
