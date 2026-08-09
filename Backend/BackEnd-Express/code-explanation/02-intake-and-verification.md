# Intake and Verification

Covers: `routes/inventory/intake.js`, `routes/inventory/intake-verification.js`

This is the "a truck just showed up with fertilizer on it, log what came in"
flow, plus the supervisor sign-off that has to happen before that stock is
trusted for anything else (like selling it).

## `POST /api/inventory/intake` — logging what a truck delivered

**Purpose:** record a new batch of stock arriving against a specific truck
run (a "Collection Advice", or CA).

A few things in here are worth explaining:

**Why the batch is created as `'Pending'`, not `'Live'`.**
Stock that just got logged by a warehouse worker hasn't been checked by
anyone yet — the quantity typed in could be wrong, the wrong item could've
been selected, etc. Marking it `Pending` means it exists in the system (so
nothing gets lost or forgotten) but it's deliberately kept out of anything
that assumes stock is trustworthy — like Available to Promise calculations —
until a supervisor verifies it.

**Why one CA can absorb more than one intake.**
A single purchase order might get delivered across several truckloads instead
of all at once. So instead of closing out the CA the moment *any* intake gets
logged against it, the code adds up everything received so far and compares
it to what the CA was supposed to deliver:

```js
const targetCaStatus = totalReceived >= expectedQty ? 'Completed' : 'Partially Received';
```

If the running total has reached (or passed) the expected quantity, the CA is
`Completed`. Otherwise it's `Partially Received` and stays open so the next
truckload can still be logged against it.

**Why a >2% mismatch gets flagged but doesn't block anything.**
Weighbridge readings on the day almost never match the paperwork exactly —
that's just how physical freight works. So instead of rejecting the intake
outright when the numbers don't match, the code compares the received
quantity to what the CA expected, and if the difference is more than 2%, it
prefixes the movement's remarks with a note:

```js
if (variancePct > 2) {
    const variancePrefix = `VARIANCE: expected ${expectedQty} MT, received ${requestedQty} MT. `;
    ...
}
```

That note is what the alerts feed later picks up as an `INTAKE_VARIANCE`
alert — so a big mismatch still gets someone's attention, it just doesn't stop
the warehouse worker from finishing their job on the spot.

## Pending intake review — `routes/inventory/intake-verification.js`

**`GET /api/inventory/intake/pending`** — lists every batch still sitting in
`Pending` status, along with who submitted it, when, and how long it's been
waiting (`hours_waiting`). This is the queue a supervisor works through.

**`PATCH /api/inventory/intake/:batch_code/verify`** — flips a batch from
`Pending` to `Live`, and only from `Pending`:

```sql
WHERE batch_code = $2 AND status_confidence = 'Pending'
```

If the batch has already been verified (or rejected, or doesn't exist), this
condition simply matches nothing, the query returns zero rows, and the route
replies with a 400 instead of silently "succeeding" on something that already
happened.

**`PATCH /api/inventory/intake/:batch_code/reject`** — this one does three
things in a single transaction, and each part exists for a specific reason:

1. Marks the batch `Rejected` and saves the reason someone typed in (a
   rejection with no reason isn't accepted — `reason` is required).
2. Calls `applyMovement` to bring the batch's quantity down to exactly zero,
   *as a recorded movement*, rather than just deleting the batch row. This
   matters for the same reason described in the shared-helpers doc: the
   quantity should never change without a movement explaining why.
3. Reopens the linked CA by setting its status back to `Dispatched`, so that
   truckload can be corrected and re-submitted instead of being permanently
   stuck.
