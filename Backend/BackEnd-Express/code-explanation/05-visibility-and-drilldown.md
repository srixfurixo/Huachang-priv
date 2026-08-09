# Visibility and Drill-Down

Covers: `routes/inventory/batches.js`, `routes/inventory/item-detail.js`,
`routes/inventory/aging.js`

Every report and summary elsewhere in this phase (dashboard, alerts,
availability) is built on top of aggregated numbers. These three routes are
the opposite — they let someone drill down into the actual raw batches behind
those numbers, which matters when a summary figure looks wrong and someone
needs to go find out *why*.

## `GET /api/inventory/batches` — every batch, filterable, paginated

This one detail matters more than it looks: the default sort order is

```sql
ORDER BY b.manufacture_date ASC NULLS LAST, b.created_at ASC
```

...oldest stock first. That's not just a display preference — it's what makes
this same endpoint double as the **FIFO pick list**. The dispatch route
doesn't have a separate "suggest which batch to use" endpoint; the intended
workflow is that the frontend calls this route filtered to a given item and
location, and adds up from the top of the (already oldest-first) list until it
has enough quantity.

It's paginated (`page`/`limit`, default 50 per page) because the batch table
can realistically grow into the thousands of rows over time, and returning
all of them on every request would be slow and mostly wasted — most people
looking at this screen only care about the first page or two.

## `GET /api/inventory/batches/:batch_code` — one batch's full life story

Alongside the batch's own fields, this pulls every movement ever recorded
against it (`inventory_movements`), newest first, with the performing user's
name joined in. The idea is that this single page should be able to fully
answer "what has ever happened to this specific batch" — every intake,
transfer, dispatch, adjustment, all in one place.

## `GET /api/inventory/items/:item_code` — one item, every warehouse

This is meant to answer the question "do we have any of this item *anywhere*"
— useful when, say, a customer calls asking about a specific product and
nobody wants to check five different warehouse screens one at a time.

The one bit of actual calculation here is the **bag equivalent**:

```js
const bag_equivalent = item.bag_weight_kg
    ? (totals.on_hand_mt * 1000) / Number(item.bag_weight_kg)
    : null;
```

Stock is always stored and calculated in metric tons internally — that never
changes. But finished goods are often sold by the bag (commonly 50kg bags),
so for items that have a `bag_weight_kg` set, this converts the on-hand
tonnage into "how many bags is that" purely for display purposes. Items sold
in bulk (no bag weight set) just get `null` here instead of a made-up number.

## `GET /api/inventory/aging` — how old is the stock sitting around

Groups every batch with stock remaining into expiry buckets: `Expired`,
`Under 30 days`, `30 to 60 days`, and so on, up to `Over 180 days`, plus a
catch-all `No expiry date set` bucket for anything that was never given an
expiry date.

`manufacture_date` and `expiry_date` had been sitting unused on every batch
row since before this phase — nothing had ever actually read them, even
though FIFO handling was supposed to be part of the system. This route (and
the aging chart on the dashboard, which reuses the same bucket logic) is what
actually puts those dates to use. Alongside the bucket totals, it also returns
the 20 oldest batches with stock left — a ready-made "deal with these first"
list for the warehouse floor.
