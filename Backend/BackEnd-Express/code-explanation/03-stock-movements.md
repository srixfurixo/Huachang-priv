# Stock Movements

Covers: `routes/inventory/dispatch.js`, `routes/inventory/transfer.js`,
`routes/inventory/adjustment.js`, `routes/inventory/returns.js`

Before this phase, stock could only go *in* (via intake). These four routes
are what let it go back out, move between warehouses, or get corrected —
which is why they were flagged as the highest priority piece of the whole
backlog. All four are thin wrappers around `applyMovement` (see
[01-shared-helpers.md](01-shared-helpers.md)) — the real logic they add is
mostly *validation*: making sure the request makes sense before touching
stock at all.

## `POST /api/inventory/dispatch` — shipping stock out

Takes a delivery order number and a list of `{ batch_code, location_id,
quantity_mt }` lines, and calls `applyMovement` once per line with a
**negative** quantity (stock leaving).

The one interesting bit is `override_reason`. The intended way to dispatch is
FIFO — always take from the oldest batch first (the batch list is sorted
oldest-first specifically so it doubles as a pick list). But sometimes a
warehouse worker has a legitimate reason to grab a newer batch instead — maybe
the oldest one is in a hard-to-reach spot, or has minor damage. Rather than
blocking that entirely, the route allows it but requires an explanation, which
gets stitched into the movement's remarks:

```js
if (override_reason) {
    const overrideNote = `FIFO OVERRIDE: ${override_reason}`;
    ...
}
```

So the flexibility exists, but it leaves a paper trail — anyone reviewing the
movement history later can see exactly when FIFO wasn't followed and why.

## `POST /api/inventory/transfer` — moving stock between warehouses

This is the main "external warehouse to internal warehouse" workflow. The
part that needs explaining is **why it creates a brand new batch at the
destination** instead of just changing the existing batch's location.

A batch's location is effectively part of its identity — `location_id` lives
directly on the `inventory_batches` row, so one batch can't be in two places
at once. Moving stock therefore means:

1. Take stock **out** of the source batch (`TRANSFER_OUT`, negative).
2. Create a **new** batch at the destination, copying over the same item,
   manufacture date, expiry date, and CA reference (so the stock's history
   isn't lost, just its location).
3. Put stock **into** that new batch (`TRANSFER_IN`, positive).

The new batch gets a generated code like `ABC123-T1` (and `-T2`, `-T3`, ...
if that batch has been split across multiple transfers before):

```js
const destBatchCode = `${prefix}${Number(countResult.rows[0].cnt) + 1}`;
```

Its status also gets set automatically based on where it's going:

```js
const destStatus = destLocationResult.rows[0].location_type === 'Internal' ? 'Live' : 'Reported';
```

Moving stock *into* an internal (company-run) warehouse means it's trusted
again (`Live`). Moving it to an external warehouse means it's now only
`Reported`, because the company can't independently verify what's sitting on
someone else's shelves the way it can its own.

Both movement rows (`TRANSFER_OUT` and `TRANSFER_IN`) get tagged with the same
`reference_doc` — the original batch code — so the two halves of one transfer
can always be found and matched back together later.

## `POST /api/inventory/adjustment` — Admin/Manager only, "fix a mistake"

This is deliberately the one sanctioned way to manually correct a quantity —
damage, shrinkage, a data-entry mistake discovered later, etc. `quantity_change`
can be positive or negative, but `reason` is **required**:

```js
if (!reason || !reason.trim()) {
    return res.status(400).json(...);
}
```

Since this route bypasses all the "why did stock change" logic that dispatch/
transfer/intake naturally have built in (there's no delivery order or CA
tying the number to anything), the mandatory reason is what keeps the
movement ledger meaningful instead of just saying "ADJUSTMENT" with no
context.

## `POST /api/inventory/return` — a customer sent stock back

Mostly a straightforward positive `applyMovement`, with one edge case worth
calling out: what if the original batch that was dispatched no longer exists
in the system (because it was fully used up and, depending on how batches get
cleaned up, might not be there anymore)? Rather than fail, the route recreates
the batch row from scratch using the `item_code` supplied in the request, so
the return still has somewhere to land:

```js
if (existingBatch.rows.length === 0) {
    if (!item_code) {
        // 400 — can't recreate a batch without knowing what item it is
    }
    // ...create a fresh batch row at qty 0, then apply the return movement
}
```

Returns are also kept as their own movement type (`RETURN`) rather than being
recorded as, say, another `INTAKE` — because a report counting up "total fresh
purchases this month" should never accidentally include stock that was simply
given back.
