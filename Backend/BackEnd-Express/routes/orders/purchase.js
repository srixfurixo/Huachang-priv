const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');

router.post('/purchase', async function (req, res) {
    const po_number = req.body.po_number;
    const supplier_id = req.body.supplier_id;
    const po_date = req.body.po_date;
    const items = req.body.items;
    const single_item_code = req.body.item_code;
    const single_ordered_qty_mt = req.body.ordered_qty_mt;

    let created_by = 1;
    if (req.user) {
        if (req.user.id) {
            created_by = req.user.id;
        }
    } else if (req.body.created_by) {
        created_by = req.body.created_by;
    }

    let lineItems = [];
    if (Array.isArray(items)) {
        if (items.length > 0) {
            lineItems = items;
        }
    } else if (single_item_code) {
        if (single_ordered_qty_mt) {
            lineItems = [
                {
                    item_code: single_item_code,
                    ordered_qty_mt: single_ordered_qty_mt
                }
            ];
        }
    }

    if (!po_number) {
        return res.status(400).json({
            success: false,
            error: 'Missing required field: po_number is required.'
        });
    }

    if (supplier_id === undefined || supplier_id === null) {
        return res.status(400).json({
            success: false,
            error: 'Missing required field: supplier_id is required.'
        });
    }

    if (!po_date) {
        return res.status(400).json({
            success: false,
            error: 'Missing required field: po_date is required.'
        });
    }

    if (lineItems.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Purchase order must have at least one line item.'
        });
    }

    let totalQty = 0;
    for (let i = 0; i < lineItems.length; i++) {
        const line = lineItems[i];
        const requestedQty = Number(line.ordered_qty_mt);

        if (!line.item_code) {
            return res.status(400).json({
                success: false,
                error: 'Line item is missing an item_code.'
            });
        }

        if (isNaN(requestedQty)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid quantity for item: ' + line.item_code
            });
        }

        if (requestedQty <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Quantity must be greater than zero for item: ' + line.item_code
            });
        }

        totalQty = totalQty + requestedQty;
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const dupCheckQuery = 'SELECT 1 FROM purchase_orders WHERE po_number = $1';
        const dupCheckResult = await client.query(dupCheckQuery, [po_number]);

        if (dupCheckResult.rows.length > 0) {
            const error = new Error('Purchase Order number already exists.');
            error.statusCode = 400;
            throw error;
        }

        const insertPoQuery = `
            INSERT INTO purchase_orders (
                po_number,
                supplier_id,
                item_code,
                po_date,
                ordered_qty_mt,
                created_by
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;

        const primaryItemCode = lineItems[0].item_code;
        const insertValues = [
            po_number,
            supplier_id,
            primaryItemCode,
            po_date,
            totalQty,
            created_by
        ];

        const insertResult = await client.query(insertPoQuery, insertValues);
        const newRecord = insertResult.rows[0];

        const insertPoLineQuery = `
            INSERT INTO purchase_order_lines (
                po_number,
                item_code,
                ordered_qty_mt,
                status
            ) VALUES ($1, $2, $3, 'Pending')
            ON CONFLICT (po_number, item_code) DO NOTHING;
        `;

        for (let i = 0; i < lineItems.length; i++) {
            const line = lineItems[i];
            const lineQty = Number(line.ordered_qty_mt);
            await client.query(insertPoLineQuery, [po_number, line.item_code, lineQty]);
        }

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Purchase Order created successfully.',
            record: newRecord
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Transaction failed for Purchase Order creation:', error);

        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                error: 'Database constraint violation: The referenced supplier, item, or user does not exist.'
            });
        }

        let statusCode = 500;
        if (error.statusCode) {
            statusCode = error.statusCode;
        }

        let errorMessage = 'An internal server error occurred while registering the Purchase Order.';
        if (statusCode !== 500) {
            errorMessage = error.message;
        }

        return res.status(statusCode).json({
            success: false,
            error: errorMessage
        });
    } finally {
        client.release();
    }
});

module.exports = router;