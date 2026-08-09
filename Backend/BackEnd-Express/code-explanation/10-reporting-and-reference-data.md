# Reporting Fixes and Reference Data

Covers changes to `Inventory/reporting.js`, `ReferenceData/item-settings.js`,
`ReferenceData/items.js`, and small `req.user.id` fixes in
`routes/orders/purchase.js`, `routes/orders/sales.js`, and
`routes/logistics/huachang-ca.js`.

## `Inventory/reporting.js` — fixing how `/overview` decided "Live" vs "Reported"

This route already existed before this phase, but it had a bug that only
showed up once `Pending` and `Rejected` batch statuses were introduced
elsewhere in this phase. The old query joined against a database *view*
(`warehouse_inventory_levels`) and decided whether stock counted as "Live" by
doing this:

```sql
CASE WHEN MAX(b.status_confidence) = 'Live' THEN 'Live' ELSE 'Reported' END
```

That only worked by accident, because at the time every batch in the system
happened to be `Live` — there was nothing else for `MAX()` to compare against.
Once `Pending` stock started existing, this would have mislabeled things
(`MAX()` compares the statuses alphabetically as text, not by any meaningful
order). Worse, the join condition only filtered on `current_qty > 0`, meaning
unverified `Pending` stock was silently being counted in the totals right
alongside verified stock.

The fix does two things: it queries `inventory_batches` directly instead of
going through the view, explicitly filters to only `Live` and `Reported`
batches (`Pending`/`Rejected` excluded entirely), and decides Live-vs-Reported
based on the *location's* type instead of guessing from the batch status:

```sql
CASE WHEN l.location_type = 'Internal' THEN 'Live' ELSE 'Reported' END AS source
```

It also now returns `live_qty_mt` and `reported_qty_mt` as separate columns
alongside the combined total, so the two can never get silently blended
together in a chart or report further down the line.

**Filters were also added** (`item_code`, `location_id`, `location_type`,
`item_type` on `/overview`; `item_code`, `location_id`, `batch_code`,
`movement_type` on `/movements`) — before this, there was no way to ask "what
happened to this one specific batch," which made investigating a specific
discrepancy unnecessarily hard.

## `ReferenceData/item-settings.js` — new route to configure per-item settings

**`PATCH /api/referenceData/items/:item_code/settings`** — lets an
Admin/Manager set an item's `threshold_level` (the point at which it should
trigger a low-stock alert) and/or `bag_weight_kg` (used for the bag-equivalent
display described in
[05-visibility-and-drilldown.md](05-visibility-and-drilldown.md)). Before this
route existed, the only way to change either of these was editing the
database directly, which isn't something you want to require for a routine
planning decision.

Both fields are optional (you can update just one), but if given,
`threshold_level` can't be negative and `bag_weight_kg` has to be either a
positive number or `null` — sending `null` is the intended way to *clear* a
bag weight for an item that's sold in bulk rather than by the bag.

## `ReferenceData/items.js` — a typo that was silently breaking every request

```js
if (can_be_comsumed !== undefined){   // <- typo: "comsumed"
```

`can_be_comsumed` was never actually defined anywhere — the destructured
variable a few lines above was correctly spelled `can_be_consumed`. In
JavaScript, referencing a variable that was never declared throws a
`ReferenceError`, which meant this route's `try` block failed on *every single
call*, regardless of what query parameters were passed, and always fell
through to the generic 500 error. Fixed by correcting the typo so it actually
references the real variable.

## `req.user.id` instead of trusting the request body

In `purchase.js`, `sales.js`, and `huachang-ca.js`, the "who created this"
field (`created_by`) used to be read straight from the request body:

```js
const { po_number, ..., created_by } = req.body;
```

That's a problem because it means anyone calling the API could just put
someone else's user ID in the request and have an action logged under that
person's name instead of their own. Now that every route requires being
logged in first, there's no reason to trust a value the caller typed in when
the real answer is already known from their login session:

```js
const created_by = req.user.id;
```

This keeps the audit trail (who created this purchase order, who logged this
truck) honest — it always reflects who actually made the authenticated
request, not whatever the request body happened to claim.
