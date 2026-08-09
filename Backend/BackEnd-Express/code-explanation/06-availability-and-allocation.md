# Availability and Allocation

Covers: `routes/inventory/availability.js`, `routes/orders/allocations.js`

Up until this phase, sales orders and stock were completely disconnected —
stock was just a number, with no link to what had already been promised to
customers. These two files are what connect them.

## `GET /api/inventory/availability` — per-item availability report

This is mostly a thin wrapper around `getAvailability()` (see
[01-shared-helpers.md](01-shared-helpers.md)), with one extra calculated
field:

```js
is_oversold: committed > onHand + inbound
```

**Oversold** means more stock has been *confirmed* to customers than the
company actually has on hand plus what's on the way. That's the single most
important flag on this whole report — it's the thing that tells someone
"we've promised more than we can deliver, deal with this now." This exact
report is what feeds the dashboard's Demand vs Supply chart.

## `routes/orders/allocations.js` — reserving stock against a sales order

**`GET /api/orders/sales/:so_number/supply-options`** — for a given sales
order, this gathers up *everything* that could potentially fill it, split
into four buckets, roughly ordered by how certain each one is:

1. `on_hand_internal` — stock physically sitting in a company warehouse,
   already verified (`Live`). The safest option.
2. `on_hand_external` — stock reported at an external warehouse, not
   independently verified — includes how many days since it was last
   confirmed, since older reports are less trustworthy.
3. `incoming_ca` — stock already on a truck, in transit.
4. `incoming_po` — stock ordered from a supplier but not yet collected at all.

A manager fulfilling an order would naturally want to see all four side by
side to decide what to actually reserve, which is why they're returned
together instead of as separate calls.

**`POST /api/orders/sales/:so_number/allocate`** — reserves a quantity
against one of those four sources. Before it commits anything, it runs
through several checks, each guarding against a specific way this could go
wrong:

- The sales order has to exist and not be cancelled — no point reserving
  stock for an order nobody's fulfilling anymore.
- `source_type` has to be one of `BATCH`, `INCOMING_CA`, or `INCOMING_PO` —
  and whatever `source_ref` was given has to actually exist in the matching
  table. This stops someone from allocating against a batch code or CA number
  that was mistyped or doesn't exist.
- If allocating from a specific batch, that batch's item has to match the
  sales order's item — you can't fill an order for fertilizer A with a batch
  of fertilizer B.
- The total allocated against the sales order (across every non-cancelled
  allocation) can't exceed what was actually ordered — otherwise a mistake
  could let the same order get "filled" three times over.
- If allocating from a batch specifically, the amount can't exceed that
  batch's remaining *unallocated* stock — calculated by subtracting whatever's
  already been reserved against that batch from its current quantity, so two
  different allocations can't both claim the same physical stock.

New allocations always start life as `'Soft'` — a tentative reservation, not
a hard commitment yet (this mirrors the Soft/Confirmed distinction from the
ATP calculation in `getAvailability`).

**`PATCH /api/orders/allocations/:id/confirm`** and **`.../cancel`** move an
allocation to `Confirmed` (locked in, now actually reduces ATP for everyone
else) or `Cancelled` (frees the reservation back up). Confirm only works on a
currently-`Soft` allocation; cancel refuses to touch anything already
`Fulfilled`, since a fulfilled allocation means the stock has already gone out
the door — there's nothing left to "cancel."

**`GET /api/orders/allocations?at_risk=true`** — this is the interesting one.
Rather than just listing allocations, it filters down to the ones that need
someone's attention, for three different reasons depending on what they were
allocated against:

```sql
(a.source_type = 'INCOMING_CA' AND ...ca.status != 'Completed' AND ca is over 14 days old...)
OR (a.source_type = 'INCOMING_PO' AND ...no supplier collection advice has been raised for that PO yet...)
OR (a.source_type = 'BATCH' AND ...that batch's current_qty has since dropped below what was allocated...)
```

In plain terms: *"this allocation depends on a truck that's overdue"*, or
*"this allocation depends on a purchase order the supplier hasn't even started
collecting yet"*, or *"this allocation depends on a specific batch, but that
batch has since been drawn down by something else and might not have enough
left."* Any of those three situations means the promise made to the customer
is shakier than it looks on paper — this filter turns allocation from a
passive record into an early-warning list.
