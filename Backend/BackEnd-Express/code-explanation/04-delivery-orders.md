# Delivery Orders

Covers: `routes/logistics/delivery-orders.js`

Before this phase, the `delivery_orders` and `delivery_order_lines` tables
existed in the database but nothing actually used them — which was a problem,
because the dispatch route (see
[03-stock-movements.md](03-stock-movements.md)) needs a real delivery order to
dispatch *against*. This file is what creates and manages that paperwork.

## `POST /api/logistics/delivery-order` — create one

Takes a customer, a date, and a list of line items, and does two things worth
explaining:

**It copies the customer's name and debtor code onto the delivery order
itself**, instead of just storing the `customer_id` and looking the name up
fresh every time:

```js
const customerResult = await client.query('SELECT debtor_code, name FROM customers WHERE id = $1', [customer_id]);
...
[do_number, do_date, customer_id, debtor_code, debtor_name]
```

This is a deliberate snapshot. If a customer's name gets corrected or updated
six months from now, old delivery orders should still show what the customer
was called *at the time* — that's what a paper delivery order would have
looked like, and it's what auditors/accountants generally expect.

**It rejects duplicate `do_number`s with a 409**, checked before anything else
gets inserted, so a duplicate request can't leave a half-built order sitting
around.

## `GET /api/logistics/delivery-orders/:do_number` — the full picture

Besides the header and line items, this also pulls in every `DISPATCH`
movement that's been recorded with this DO number as its `reference_doc`:

```sql
WHERE im.reference_doc = $1 AND im.movement_type = 'DISPATCH'
```

The reason: a delivery order describes what was *supposed* to ship, but the
actual dispatch movements describe what *actually* shipped (which batches, how
much). Showing both side by side lets someone catch a mismatch — e.g. an
order for 20 MT that only ever had 15 MT dispatched against it.

## `PATCH /api/logistics/delivery-orders/:do_number/cancel` — cancel one

This checks whether any stock has already been dispatched against the order
before allowing the cancel:

```js
if (dispatchedCheck.rows.length > 0) {
    return res.status(400).json({
        error: 'Stock has already been dispatched against this delivery order. Use a RETURN to reverse it instead.'
    });
}
```

The reasoning: cancelling is fine when it's just paperwork that hasn't turned
into a real stock movement yet. But once stock has physically left the
warehouse against this order, "cancelling" it would just make the paperwork
disagree with reality — the correct move at that point is to process a
[return](03-stock-movements.md#post-apiinventoryreturn--a-customer-sent-stock-back),
which properly records the stock coming back in.
