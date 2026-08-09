# Stocktake

Covers: `routes/inventory/stocktake.js`

This is the most direct fix for the original complaint that kicked this whole
phase off: the system's numbers and what's actually on the warehouse floor
don't agree. A stocktake is a physical count — someone walks the warehouse,
counts what's really there, and this route reconciles that against what the
system thinks is there.

It's built as a **session** with a deliberate multi-step lifecycle
(`Open → Submitted → Approved`) instead of a single "update the count" action,
and that staging is the whole point:

## `POST /api/inventory/stocktake` — start a count

Creates a session for a location and returns every batch currently at that
location along with its *system* quantity, so the frontend can print/render a
count sheet. Only one `Open` session is allowed per location at a time:

```js
if (openCheck.rows.length > 0) {
    // 409 — this location already has an open session
}
```

That stops two people from accidentally starting two separate counts for the
same warehouse at the same time and ending up with conflicting numbers.

## `POST /api/inventory/stocktake/:id/submit` — record what was actually counted

For each line, this calculates the **variance** — the difference between what
was physically counted and what the system said should be there:

```js
const varianceQty = countedQty - systemQty;
```

Importantly: **submitting a count does not touch actual stock yet.** It just
records the variance and moves the session to `Submitted`. This is
intentional — a first count is a claim, not a fact. Someone (a manager) still
needs to review it before the system's numbers get changed based on it.

## `PATCH /api/inventory/stocktake/:id/approve` — Admin/Manager only

This is the step that actually corrects the system. For every line where the
variance isn't zero, it calls `applyMovement` with type `ADJUSTMENT`:

```js
if (varianceQty === 0) {
    continue;
}
await applyMovement(client, {
    ...,
    movement_type: 'ADJUSTMENT',
    quantity_change: varianceQty,
    reference_doc: `STOCKTAKE-${id}`,
    remarks: 'Physical stocktake count correction.',
    ...
});
```

Lines with zero variance are skipped entirely — there's nothing to correct,
and creating a movement row that says "changed by 0" would just be noise in
the ledger. Every real correction gets tagged with `STOCKTAKE-<session id>` as
its reference, so anyone looking at the movement history later can trace an
adjustment straight back to the specific count that caused it, instead of it
looking like an unexplained manual change.

Only after every variance line has been applied does the session itself get
marked `Approved`.

## `PATCH /api/inventory/stocktake/:id/cancel` — abandon a session

For a session started by mistake (wrong location, duplicate, etc.). It
refuses once the session has moved past `Open`, because once counts have been
submitted, there's a real claim on record that needs to be either approved or
consciously dealt with — not just quietly thrown away.
