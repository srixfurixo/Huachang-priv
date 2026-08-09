# Alerts

Covers: `routes/inventory/alerts.js`

## `GET /api/inventory/alerts`

This is a single combined feed that pulls together eleven different kinds of
warnings from all across inventory, sales orders, and logistics, so nobody
has to check ten different screens to know what needs attention today. Each
alert type is a small, focused SQL query — kept as its own function so each
one stays easy to read on its own — and they all get run in parallel and
merged into one list.

Here's what each type actually means and why it's worth flagging, roughly in
the order of how serious they are:

| Type | Severity | What it means |
|---|---|---|
| `OUT_OF_STOCK` | Critical | An item has zero verified stock *and* there are still open sales orders for it — someone's waiting on something that doesn't exist. |
| `OVERSOLD` | Critical | More stock has been confirmed to customers than the company has on hand plus what's incoming. |
| `EXPIRED` | Critical | A batch's expiry date has already passed and there's still stock sitting in it. |
| `LOW_STOCK` | High | Available-to-Promise has dropped below the item's configured reorder threshold. |
| `EXPIRING_30` | High | A batch expires within the next 30 days and still has stock — dispatch this one first. |
| `INTAKE_VARIANCE` | High | An intake's received quantity didn't match the paperwork by more than 2% (see [02-intake-and-verification.md](02-intake-and-verification.md)) — worth double-checking. |
| `EXPIRING_60` | Medium | Same idea as `EXPIRING_30`, just a wider 30–60 day window, so it's less urgent. |
| `STALE_REPORT` | Medium | A batch at an external warehouse hasn't been re-verified in over 14 days — the number on file might be out of date. |
| `PENDING_VERIFICATION` | Medium | A batch has been sitting in `Pending` for over 24 hours without a supervisor checking it. |
| `CA_NOT_RECEIVED` | Medium | A truck was dispatched over a week ago and still hasn't been logged as received. |
| `PO_OVERDUE` | Medium | A purchase order is over 30 days old and the supplier still hasn't delivered all of it. |

**Why `LOW_STOCK` compares against Available-to-Promise instead of raw
on-hand stock.** This is worth calling out specifically because it's easy to
get backwards. If this alert just checked raw stock against the threshold, it
would be wrong in *both* directions: it would nag about items that actually
have plenty more arriving next week, and it would stay silent about items
that look fine on the shelf but have already been fully sold to someone else.
Comparing against ATP (which already accounts for what's incoming and what's
already promised) is what makes the alert actually mean something.

**Why the response is sorted Critical, then High, then Medium.** So whoever's
looking at this list sees the things that need immediate action first, without
having to scroll or re-sort it themselves.

**Filters (`severity`, `location_id`, `type`).** These narrow down the same
combined list — e.g. a warehouse supervisor might only want alerts for their
own location. This route also exports its full alert-gathering logic
(`getAllAlerts`) so the dashboard summary (see
[09-dashboard.md](09-dashboard.md)) can reuse the exact same rules instead of
re-implementing them.

## Why the low-stock alert type in the old `Inventory/reporting.js` file was left alone

That older, simpler `/alerts/low-stock` route still exists and still works —
it was deliberately left in place rather than removed, so nothing that was
already depending on it breaks. This new combined `/alerts` route is meant to
supersede it going forward, not delete it out from under anyone.
