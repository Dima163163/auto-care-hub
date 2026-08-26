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

For a PostGIS staging comparison, create the index concurrently on the restored
snapshot (the stock launch migration intentionally does not require the
extension):

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  "IDX_autocare_locations_geography_gist"
  ON "autocare_service_locations"
  USING gist ((ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography))
  WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;
```

Then run `npm --prefix server run benchmark:discovery:geospatial`; it refuses to
claim a GiST comparison unless both the extension and this geography index are
present. The command also compares result counts at each radius and exits
non-zero if the planner does not use the GiST index.
