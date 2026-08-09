# Dashboard Summary

Covers: `routes/inventory/dashboard.js`

## `GET /api/inventory/dashboard/summary`

Everything the manager dashboard screen needs, in one API call, instead of
the frontend having to make ten separate requests (KPIs, chart data, alerts,
recent activity...) and stitch them together itself.

The main thing worth understanding about this route is that it **doesn't
duplicate logic that already exists elsewhere** — it reuses the same shared
pieces the other routes use:

- `getAvailability()` (see [01-shared-helpers.md](01-shared-helpers.md)) for
  the Available-to-Promise total and the demand-vs-supply figures.
- `getAllAlerts()` (see [07-alerts.md](07-alerts.md)) for both the alert
  counts in the KPIs and the top-20 alert list in the response.
- The same expiry-bucket logic (`BUCKET_SQL` / `BUCKET_ORDER`) as the aging
  report (see [05-visibility-and-drilldown.md](05-visibility-and-drilldown.md)).

The reasoning: if the dashboard calculated "how many items are low on stock"
with its own separate query, and the alerts feed calculated the exact same
thing with slightly different logic, they could quietly disagree with each
other over time as one gets updated and the other doesn't. Reusing the exact
same functions means the dashboard's numbers and the alerts feed's numbers
are guaranteed to always match.

A few specific pieces:

**`live_mt` / `reported_mt` / `total_on_hand_mt`.** Stock is split by how
trustworthy it is — `Live` (verified, in a company warehouse) versus
`Reported` (self-reported from an external location, not independently
confirmed) — and the total is just the two added together. Keeping them
separate in the response (rather than only showing one combined number) lets
the dashboard show how much of "what we have" is actually solid versus how
much is someone else's word for it.

**`available_to_promise_mt`.** Rather than re-deriving this, it just sums up
the `available_to_promise` figure that `getAvailability()` already calculated
per item.

**`net_change_7d_mt`.** Instead of keeping a separate daily snapshot table
just to answer "did stock go up or down this week" (which would need its own
maintenance and could drift out of sync), this is derived on the fly straight
from the movement ledger:

```sql
SELECT COALESCE(SUM(quantity_change), 0) AS net_change_7d
FROM inventory_movements
WHERE movement_date >= NOW() - INTERVAL '7 days'
```

Since every stock change already goes through `applyMovement` and gets logged
there (see [01-shared-helpers.md](01-shared-helpers.md)), the ledger is
already a complete, trustworthy history — there's no need to duplicate it.

**KPI counts (`low_stock_count`, `out_of_stock_count`, etc.).** These are
just tallies of how many alerts of each type came back from `getAllAlerts()`
— counted with a plain loop rather than one query per count, since the alert
list was already being fetched anyway.

**`movement_trend`.** Groups movements by day and splits them into
`intake_mt` (positive quantity changes) and `outtake_mt` (the absolute value
of negative ones), defaulting to the last 30 days if no `from`/`to` range is
given. This is what feeds a chart showing stock flow over time, rather than
just a single point-in-time total.

**Filters (`location_id`, `location_type`).** These narrow down the KPI and
breakdown figures to a specific warehouse or warehouse type, useful when a
supervisor only cares about their own site rather than the company-wide
picture.
