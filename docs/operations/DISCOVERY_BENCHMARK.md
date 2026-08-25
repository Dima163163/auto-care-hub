# Discovery benchmark

`npm --prefix server run benchmark:discovery:synthetic` runs the deterministic
portable baseline against 10,000 and 100,000 synthetic service points. It
reports p50/p95/max for the bounded distance-ranked page of 20 results.

The script deliberately labels PostGIS as `not-run`: a meaningful PostGIS/GiST
comparison requires a staging PostgreSQL instance with the extension enabled.
Run the database-backed benchmark with `npm --prefix server run
benchmark:discovery` after Docker or staging is available, then record the
PostGIS comparison next to the output rather than mixing synthetic and
production measurements.
