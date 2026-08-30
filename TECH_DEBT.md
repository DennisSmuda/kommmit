# Tech debt

## Flattest route silently missing, no dedup with recommended route

`server/domain/routing/flattest-route.ts` (`findFlattestPath`) returns `null`
on any failure — large graph (>60k nodes), Open-Elevation fetch/timeout
failure, elevation count mismatch, or no path found. `find-route.ts` just
omits the `flattest` route in that case, with no reason surfaced to the
client or user.

Also: unlike bike alternates (`alternate-routes.ts`, `overlapRatio` dedup
against `maxOverlapRatio = 0.6`), the flattest route has no dedup check
against the recommended route. It can come back identical or near-identical
to route 0 and still get shown as a separate option.

Possible fixes, not done yet:
- surface a reason code (`elevation_unavailable`, `graph_too_large`,
  `no_path`) instead of silently dropping the option
- apply the same overlap dedup used for alternates, or drop `flattest` when
  it matches the recommended route closely enough
- raise/adjust `MAX_NODES_FOR_ELEVATION` or chunk large-graph elevation
  fetches more efficiently instead of skipping outright
