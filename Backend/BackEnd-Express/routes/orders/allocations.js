const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');

router.get('/sales/:so_number/supply-options', async (req, res) => {
    const { so_number } = req.params;

    try {
        const soResult = await pool.query(
            `SELECT so.so_number, so.item_code, so.customer_id, so.ordered_qty_mt::float AS ordered_qty_mt, so.status
             FROM sales_orders so WHERE so.so_number = $1`,
            [so_number]
        );

        if (soResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: `Sales order '${so_number}' not found.` });
        }

        const salesOrder = soResult.rows[0];
        const itemCode = salesOrder.item_code;

        const allocatedResult = await pool.query(
            `SELECT COALESCE(SUM(allocated_qty_mt), 0)::float AS total_allocated
             FROM sales_order_allocations WHERE so_number = $1 AND status != 'Cancelled'`,
            [so_number]
        );

        const onHandInternalResult = await pool.query(
            `SELECT b.batch_code, b.current_qty::float AS current_qty, b.manufacture_date, b.expiry_date, l.name AS location
             FROM inventory_batches b
             JOIN locations l ON l.id = b.location_id
             WHERE b.item_code = $1 AND l.location_type = 'Internal' AND b.status_confidence = 'Live' AND b.current_qty > 0
             ORDER BY b.manufacture_date ASC NULLS LAST, b.created_at ASC`,
            [itemCode]
        );

        const onHandExternalResult = await pool.query(
            `SELECT b.batch_code, b.current_qty::float AS current_qty, b.manufacture_date, b.expiry_date, l.name AS location,
                    b.last_verified_at,
                    CASE WHEN b.last_verified_at IS NOT NULL THEN EXTRACT(DAY FROM (NOW() - b.last_verified_at)) ELSE NULL END AS days_since_verified
             FROM inventory_batches b
             JOIN locations l ON l.id = b.location_id
             WHERE b.item_code = $1 AND l.location_type != 'Internal' AND b.status_confidence = 'Reported' AND b.current_qty > 0
             ORDER BY b.manufacture_date ASC NULLS LAST, b.created_at ASC`,
            [itemCode]
        );

        const incomingCaResult = await pool.query(
            `SELECT hca.hg_ca_number, hca.quantity_mt::float AS quantity_mt, hca.ca_date, hca.status, hca.transporter_name
             FROM huachang_collection_advices hca
             WHERE hca.item_code = $1 AND hca.status NOT IN ('Completed', 'Cancelled')
             ORDER BY hca.ca_date ASC`,
            [itemCode]
        );

        const incomingPoResult = await pool.query(
            `SELECT po.po_number, po.supplier_id, s.name AS supplier_name, po.po_date,
                    po.ordered_qty_mt::float AS ordered_qty_mt,
                    COALESCE(SUM(sca.available_qty_mt), 0)::float AS collected_qty_mt,
                    (po.ordered_qty_mt - COALESCE(SUM(sca.available_qty_mt), 0))::float AS remaining_qty_mt
             FROM purchase_orders po
             JOIN suppliers s ON s.id = po.supplier_id
             LEFT JOIN supplier_collection_advices sca ON sca.po_number = po.po_number
             WHERE po.item_code = $1
             GROUP BY po.po_number, po.supplier_id, s.name, po.po_date, po.ordered_qty_mt
             HAVING (po.ordered_qty_mt - COALESCE(SUM(sca.available_qty_mt), 0)) > 0
             ORDER BY po.po_date ASC`,
            [itemCode]
        );

        res.json({
            success: true,
            sales_order: salesOrder,
            already_allocated_mt: allocatedResult.rows[0].total_allocated,
            on_hand_internal: onHandInternalResult.rows,
            on_hand_external: onHandExternalResult.rows,
            incoming_ca: incomingCaResult.rows,
            incoming_po: incomingPoResult.rows
        });
    } catch (err) {
        console.error('Supply options error:', err.stack);
        res.status(500).json({ success: false, error: 'Failed to load supply options' });
    }
});

router.post('/sales/:so_number/allocate', async (req, res) => {
    const { so_number } = req.params;
    const { allocated_qty_mt, source_type, source_ref } = req.body;

    if (allocated_qty_mt === undefined || !source_type || !source_ref) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: allocated_qty_mt, source_type, and source_ref are required.'
        });
    }

    const requestedQty = Number(allocated_qty_mt);
    if (isNaN(requestedQty) || requestedQty <= 0) {
        return res.status(400).json({
            success: false,
            error: 'allocated_qty_mt must be a positive number greater than 0.'
        });
    }

    if (!['BATCH', 'INCOMING_CA', 'INCOMING_PO'].includes(source_type)) {
        return res.status(400).json({
            success: false,
            error: "source_type must be one of 'BATCH', 'INCOMING_CA', or 'INCOMING_PO'."
        });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const soResult = await client.query(
            `SELECT item_code, ordered_qty_mt, status FROM sales_orders WHERE so_number = $1 FOR UPDATE`,
            [so_number]
        );

        if (soResult.rows.length === 0) {
            const error = new Error(`Sales order '${so_number}' not found.`);
            error.statusCode = 404;
            throw error;
        }

        const salesOrder = soResult.rows[0];
        if (salesOrder.status === 'Cancelled') {
            const error = new Error('Cannot allocate stock to a cancelled sales order.');
            error.statusCode = 400;
            throw error;
        }

        const itemCode = salesOrder.item_code;

        if (source_type === 'BATCH') {
            const batchResult = await client.query(
                'SELECT item_code, current_qty FROM inventory_batches WHERE batch_code = $1',
                [source_ref]
            );

            if (batchResult.rows.length === 0) {
                const error = new Error(`Batch '${source_ref}' not found.`);
                error.statusCode = 400;
                throw error;
            }

            if (batchResult.rows[0].item_code !== itemCode) {
                const error = new Error(`Batch '${source_ref}' holds item '${batchResult.rows[0].item_code}', which does not match the sales order's item '${itemCode}'.`);
                error.statusCode = 400;
                throw error;
            }

            const batchAllocatedResult = await client.query(
                `SELECT COALESCE(SUM(allocated_qty_mt), 0) AS total
                 FROM sales_order_allocations WHERE source_type = 'BATCH' AND source_ref = $1 AND status != 'Cancelled'`,
                [source_ref]
            );
            const batchAlreadyAllocated = Number(batchAllocatedResult.rows[0].total);
            const batchRemaining = Number(batchResult.rows[0].current_qty) - batchAlreadyAllocated;

            if (requestedQty > batchRemaining) {
                const error = new Error(`Requested allocation ${requestedQty} MT exceeds batch '${source_ref}' remaining unallocated stock of ${batchRemaining} MT.`);
                error.statusCode = 400;
                throw error;
            }
        } else if (source_type === 'INCOMING_CA') {
            const caResult = await client.query(
                'SELECT item_code FROM huachang_collection_advices WHERE hg_ca_number = $1',
                [source_ref]
            );
            if (caResult.rows.length === 0) {
                const error = new Error(`Collection advice '${source_ref}' not found.`);
                error.statusCode = 400;
                throw error;
            }
        } else if (source_type === 'INCOMING_PO') {
            const poResult = await client.query(
                'SELECT item_code FROM purchase_orders WHERE po_number = $1',
                [source_ref]
            );
            if (poResult.rows.length === 0) {
                const error = new Error(`Purchase order '${source_ref}' not found.`);
                error.statusCode = 400;
                throw error;
            }
        }

        const soAllocatedResult = await client.query(
            `SELECT COALESCE(SUM(allocated_qty_mt), 0) AS total
             FROM sales_order_allocations WHERE so_number = $1 AND status != 'Cancelled'`,
            [so_number]
        );
        const soAlreadyAllocated = Number(soAllocatedResult.rows[0].total);

        if (soAlreadyAllocated + requestedQty > Number(salesOrder.ordered_qty_mt)) {
            const error = new Error(`Allocating ${requestedQty} MT would exceed sales order '${so_number}''s ordered quantity of ${salesOrder.ordered_qty_mt} MT (already allocated: ${soAlreadyAllocated} MT).`);
            error.statusCode = 400;
            throw error;
        }

        const insertResult = await client.query(
            `INSERT INTO sales_order_allocations (so_number, item_code, allocated_qty_mt, source_type, source_ref, status, created_by)
             VALUES ($1, $2, $3, $4, $5, 'Soft', $6)
             RETURNING *`,
            [so_number, itemCode, requestedQty, source_type, source_ref, req.user.id]
        );

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Allocation created successfully.',
            allocation: insertResult.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Transaction failed for allocation:', error);

        const statusCode = error.statusCode || 500;
        const errorMessage = statusCode === 500
            ? 'An internal server error occurred while creating the allocation.'
            : error.message;

        return res.status(statusCode).json({ success: false, error: errorMessage });
    } finally {
        client.release();
    }
});

router.patch('/allocations/:id/confirm', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `UPDATE sales_order_allocations SET status = 'Confirmed' WHERE id = $1 AND status = 'Soft' RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, error: `Allocation '${id}' is not in Soft status.` });
        }

        res.json({ success: true, message: 'Allocation confirmed.', allocation: result.rows[0] });
    } catch (err) {
        console.error('Allocation confirm error:', err.stack);
        res.status(500).json({ success: false, error: 'Failed to confirm allocation' });
    }
});

router.patch('/allocations/:id/cancel', async (req, res) => {
    const { id } = req.params;

    try {
        const existing = await pool.query('SELECT status FROM sales_order_allocations WHERE id = $1', [id]);

        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: `Allocation '${id}' not found.` });
        }

        if (existing.rows[0].status === 'Fulfilled') {
            return res.status(400).json({ success: false, error: 'A fulfilled allocation cannot be cancelled.' });
        }

        const result = await pool.query(
            `UPDATE sales_order_allocations SET status = 'Cancelled' WHERE id = $1 RETURNING *`,
            [id]
        );

        res.json({ success: true, message: 'Allocation cancelled.', allocation: result.rows[0] });
    } catch (err) {
        console.error('Allocation cancel error:', err.stack);
        res.status(500).json({ success: false, error: 'Failed to cancel allocation' });
    }
});

router.get('/allocations', async (req, res) => {
    const { so_number, item_code, status, source_type, at_risk } = req.query;
    const params = [];
    const filters = [];

    if (so_number) {
        params.push(so_number);
        filters.push(`a.so_number = $${params.length}`);
    }

    if (item_code) {
        params.push(item_code);
        filters.push(`a.item_code = $${params.length}`);
    }

    if (status) {
        params.push(status);
        filters.push(`a.status = $${params.length}`);
    }

    if (source_type) {
        params.push(source_type);
        filters.push(`a.source_type = $${params.length}`);
    }

    if (at_risk === 'true') {
        filters.push(`(
            (a.source_type = 'INCOMING_CA' AND EXISTS (
                SELECT 1 FROM huachang_collection_advices hca
                WHERE hca.hg_ca_number = a.source_ref
                  AND hca.status != 'Completed'
                  AND hca.ca_date < (CURRENT_DATE - INTERVAL '14 days')
            ))
            OR (a.source_type = 'INCOMING_PO' AND NOT EXISTS (
                SELECT 1 FROM supplier_collection_advices sca WHERE sca.po_number = a.source_ref
            ))
            OR (a.source_type = 'BATCH' AND EXISTS (
                SELECT 1 FROM inventory_batches b
                WHERE b.batch_code = a.source_ref AND b.current_qty < a.allocated_qty_mt
            ))
        )`);
    }

    let whereClause = '';
    if (filters.length) {
        whereClause = `WHERE ${filters.join(' AND ')}`;
    }

    try {
        const result = await pool.query(
            `
            SELECT
                a.id, a.so_number, a.item_code, i.description AS item_description,
                a.allocated_qty_mt::float AS allocated_qty_mt, a.source_type, a.source_ref, a.status,
                a.created_at, so.so_date, so.customer_id, c.name AS customer_name
            FROM sales_order_allocations a
            JOIN sales_orders so ON so.so_number = a.so_number
            JOIN customers c ON c.id = so.customer_id
            JOIN items i ON i.item_code = a.item_code
            ${whereClause}
            ORDER BY a.created_at DESC
            `,
            params
        );

        res.json({ success: true, allocations: result.rows });
    } catch (err) {
        console.error('Allocations list error:', err.stack);
        res.status(500).json({ success: false, error: 'Failed to load allocations' });
    }
});

module.exports = router;
