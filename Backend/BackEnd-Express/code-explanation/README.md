# Code Explanation — Inventory Phase Backend

This folder explains, in plain English, what all the inventory/orders/logistics
routes added in this phase actually do and *why* they're written the way they
are. It's not a line-by-line walkthrough — it's meant so anyone (technical or
not) can open a file, read the matching doc, and understand the point of the
route and the reasoning behind the trickier bits.

## How this folder is organized

Instead of one file per route (that'd be ~30 files), routes are grouped by the
job they do, matching how they're grouped in the actual codebase:

| File | Covers |
|---|---|
| [01-shared-helpers.md](01-shared-helpers.md) | `Helpers/itemType.js`, `Helpers/stockMovement.js`, `Helpers/availability.js` — the shared logic every route below builds on |
| [02-intake-and-verification.md](02-intake-and-verification.md) | Logging incoming stock and having a supervisor check it |
| [03-stock-movements.md](03-stock-movements.md) | Dispatch, transfer, adjustment, return — anything that moves or corrects stock |
| [04-delivery-orders.md](04-delivery-orders.md) | Creating and tracking delivery orders |
| [05-visibility-and-drilldown.md](05-visibility-and-drilldown.md) | Batch lists, item drill-down, expiry aging |
| [06-availability-and-allocation.md](06-availability-and-allocation.md) | "How much can I actually promise a customer" and reserving stock against sales orders |
| [07-alerts.md](07-alerts.md) | The combined warning feed (out of stock, oversold, expiring, etc.) |
| [08-stocktake.md](08-stocktake.md) | Physical stock counts and reconciling them against the system |
| [09-dashboard.md](09-dashboard.md) | The one-call summary that feeds the manager dashboard |
| [10-reporting-and-reference-data.md](10-reporting-and-reference-data.md) | Existing reports that got fixed/extended, item settings, and a few small bug fixes |

## Two patterns you'll see repeated everywhere

Rather than re-explain these in every doc, here they are once:

**1. Every route that changes data wraps its work in a database transaction:**

```js
await client.query('BEGIN');
// ...do several INSERT/UPDATE statements...
await client.query('COMMIT');
```

If anything goes wrong partway through (a `throw` happens), the `catch` block
runs `ROLLBACK` instead, which undoes everything back to where it started. This
matters because a lot of these routes touch more than one table — e.g.
dispatching stock updates both `inventory_batches` and `inventory_movements`.
Without a transaction, a crash halfway through could leave the batch quantity
updated but no record of why, which would make the numbers impossible to trust.

**2. Errors carry a `statusCode` so one `catch` block can handle everything:**

```js
const error = new Error('Batch not found.');
error.statusCode = 404;
throw error;
```

Instead of writing a different `res.status(...)` for every possible failure,
the code throws a normal JavaScript error with an extra `.statusCode`
property stuck on it, and the `catch` block at the bottom reads that property
to decide what HTTP status to send back. If no `.statusCode` was set, it
assumes something unexpected broke and returns a generic 500 rather than
leaking a raw database error message to the caller.

Both patterns are just "the house style" already used in the original login/
purchase-order code before this phase — they were kept consistent rather than
reinvented.

## One thing worth knowing about access control

None of these route files check *who* is allowed to call them — that
happens once, centrally, in `app.js`, where each route is wired up behind
`authenticate` (are you logged in?) and `authorize('Role', ...)` (are you
allowed to do this?). So if you're looking at a route file and wondering "wait,
what stops a warehouse employee from calling this admin-only endpoint?" — the
answer lives in `app.js`, not in the route file itself.
