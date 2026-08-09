# Shared Helpers

Three small files that don't handle any HTTP requests themselves — they're
building blocks that a lot of the actual routes import and reuse. The whole
point of pulling this logic out into its own files is so the same rule only
has to be written (and gotten right) once, instead of being copy-pasted
slightly differently into ten different route files.

## `Helpers/itemType.js` — deciding what kind of item something is

There's no `item_type` column in the database. Instead, every item has three
yes/no flags: `can_be_sold`, `can_be_consumed`, `can_be_produced`. This file
turns those three flags into one human-readable label using a SQL `CASE`:

```sql
CASE
    WHEN i.can_be_produced THEN 'Finished Good'
    WHEN i.can_be_consumed AND NOT i.can_be_sold THEN 'Raw Material'
    ELSE 'Trading Item'
END
```

In plain words: if it can be manufactured, it's a **Finished Good**. If it
can't be manufactured but can be used up in production and *isn't* something
you'd sell directly, it's a **Raw Material** (think fertilizer inputs). Anything
left over — stuff bought and sold as-is — is a **Trading Item**.

This exact snippet gets dropped into a dozen different queries (dashboard
composition chart, batch lists, availability report, alerts...). Centralizing
it means if the business rule for "what counts as a Raw Material" ever
changes, it changes in one place and every report agrees with every other
report.

## `Helpers/stockMovement.js` — the only door into changing stock quantity

This exports one function: `applyMovement(client, options)`. It's the single
most important piece of plumbing in this whole phase, because **every route
that changes how much stock is on hand goes through this function** —
dispatch, transfer, adjustment, return, rejecting a bad intake, approving a
stocktake. Nothing updates `inventory_batches.current_qty` directly anywhere
else in the codebase.

Why funnel everything through one function instead of letting each route
write its own `UPDATE`? Two reasons:

1. **So the numbers can always be explained.** Every single call to
   `applyMovement` also writes a row into `inventory_movements` — the ledger.
   If someone asks "why does this batch only have 3 MT left?", you can always
   answer by looking at the movement history, because there's no way for the
   quantity to have changed without a movement row being created alongside it.
2. **So the "can't go negative" rule can't be skipped.** Before applying a
   decrease, it checks:

   ```js
   if (change < 0 && newQty < 0) {
       // throw a 400 error naming the batch and the shortfall
   }
   ```

   This stops someone from accidentally dispatching more stock than a batch
   actually has. If every route wrote its own update logic, it would be easy
   for one of them to forget this check.

It also locks the batch row with `FOR UPDATE` before reading its quantity.
That matters if two requests hit the system at almost the same time (say, two
people trying to dispatch from the same low-stock batch) — the lock makes the
second request wait until the first one has finished, so they can't both read
"5 MT available" and both succeed in taking 5 MT, leaving the batch at -5.

## `Helpers/availability.js` — "how much can I actually promise a customer?"

This exports `getAvailability(itemCodes)`, which calculates **Available to
Promise (ATP)** for one or more items. ATP is the core number the whole
allocation/availability feature is built around, so it's worth explaining why
it's calculated the way it is:

```
available_to_promise = on_hand (Live) + inbound − committed (Confirmed)
```

- **On-hand** only counts stock marked `Live` — i.e. stock a supervisor has
  already verified. `Reported` stock (external warehouse, self-reported, not
  independently confirmed) is tracked separately and kept *out* of ATP,
  because it's less certain.
- **Inbound** is stock already on a truck (`huachang_collection_advices`) that
  hasn't arrived yet but is realistically on its way.
- **Committed** only counts `Confirmed` allocations — stock that's been
  reserved and locked in for a specific sales order. `Soft` allocations
  (a planner tentatively earmarking stock, not a firm commitment yet) are
  reported separately as `soft_committed_mt` and deliberately **not**
  subtracted from ATP. The reasoning: if soft allocations reduced ATP, a
  planner casually exploring options could accidentally make stock look
  unavailable to everyone else, even though nothing is actually locked in yet.

Every number in the result is wrapped in `COALESCE(..., 0)`, so an item with
no batches, no incoming trucks, and no orders yet shows up as all zeros
instead of `null` — which matters because the routes that consume this data
do math on these numbers (`on_hand_mt + inbound_mt - committed_mt`), and doing
math on `null` in JavaScript silently produces `NaN`.
