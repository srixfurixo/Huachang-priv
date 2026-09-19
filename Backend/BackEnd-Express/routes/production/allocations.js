const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');


router.get(['/production/supply-options', '/supply-options'], async (req, res) => {
    const { item_code } = req.query;

    if (!item_code) {
        return res.status(400).json({
            success: false,
            error: 'Query parameter "item_code" is required.'
        });
    }

    const cleanItemCode = item_code.trim();

    try {
        // 1. Internal Warehouses (Includes any active location not explicitly marked External)
        const onHandInternalQuery = `
            SELECT 
                b.batch_code,
                b.item_code,
                COALESCE(l.name, 'Main Warehouse') AS location_name,
                b.current_qty::float AS physical_qty_mt,
                COALESCE(SUM(pma.allocated_qty_mt), 0)::float AS reserved_qty_mt,
                (b.current_qty - COALESCE(SUM(pma.allocated_qty_mt), 0))::float AS available_qty_mt,
                b.manufacture_date,
                b.expiry_date
            FROM inventory_batches b
            LEFT JOIN locations l ON b.location_id = l.id
            LEFT JOIN production_material_allocations pma 
                ON pma.source_ref = b.batch_code 
               AND pma.source_type = 'BATCH' 
               AND pma.status = 'Reserved'
            WHERE TRIM(b.item_code) ILIKE $1
              AND (l.location_type IS NULL OR l.location_type NOT ILIKE 'External%')
              AND b.current_qty > 0
            GROUP BY b.batch_code, b.item_code, l.name, b.current_qty, b.manufacture_date, b.expiry_date, b.created_at
            HAVING (b.current_qty - COALESCE(SUM(pma.allocated_qty_mt), 0)) > 0
            ORDER BY b.expiry_date ASC NULLS LAST, b.manufacture_date ASC NULLS LAST;
        `;

        // 2. External Rented Warehouses
        const onHandExternalQuery = `
            SELECT 
                b.batch_code,
                b.item_code,
                COALESCE(l.name, 'External Storage') AS location_name,
                b.current_qty::float AS physical_qty_mt,
                COALESCE(SUM(pma.allocated_qty_mt), 0)::float AS reserved_qty_mt,
                (b.current_qty - COALESCE(SUM(pma.allocated_qty_mt), 0))::float AS available_qty_mt,
                b.manufacture_date,
                b.expiry_date
            FROM inventory_batches b
            JOIN locations l ON b.location_id = l.id
            LEFT JOIN production_material_allocations pma 
                ON pma.source_ref = b.batch_code 
               AND pma.source_type = 'BATCH' 
               AND pma.status = 'Reserved'
            WHERE TRIM(b.item_code) ILIKE $1 
              AND l.location_type ILIKE 'External%'
              AND b.current_qty > 0
            GROUP BY b.batch_code, b.item_code, l.name, b.current_qty, b.manufacture_date, b.expiry_date, b.created_at
            HAVING (b.current_qty - COALESCE(SUM(pma.allocated_qty_mt), 0)) > 0
            ORDER BY b.expiry_date ASC NULLS LAST, b.manufacture_date ASC NULLS LAST;
        `;

        // 3. Inbound CAs
        const incomingCaQuery = `
            SELECT 
                sca.id AS supplier_ca_id,
                sca.supplier_ca_ref,
                sca.ca_date,
                pol.po_number,
                s.name AS supplier_name,
                sca.available_qty_mt::float AS ca_qty_mt,
                COALESCE(SUM(pma.allocated_qty_mt), 0)::float AS reserved_qty_mt,
                (sca.available_qty_mt - COALESCE(SUM(pma.allocated_qty_mt), 0))::float AS available_qty_mt
            FROM supplier_collection_advices sca
            JOIN purchase_order_lines pol ON sca.po_line_id = pol.id
            JOIN purchase_orders po ON pol.po_number = po.po_number
            JOIN suppliers s ON po.supplier_id = s.id
            LEFT JOIN production_material_allocations pma 
                ON pma.source_ref = sca.id::text 
               AND pma.source_type = 'INCOMING_CA' 
               AND pma.status = 'Reserved'
            WHERE TRIM(pol.item_code) ILIKE $1
            GROUP BY sca.id, sca.supplier_ca_ref, sca.ca_date, pol.po_number, s.name, sca.available_qty_mt
            HAVING (sca.available_qty_mt - COALESCE(SUM(pma.allocated_qty_mt), 0)) > 0
            ORDER BY sca.ca_date ASC;
        `;

        // 4. Open POs
        const incomingPoQuery = `
            SELECT 
                pol.id AS po_line_id,
                po.po_number,
                po.po_date,
                s.name AS supplier_name,
                pol.ordered_qty_mt::float AS ordered_qty_mt,
                COALESCE(SUM(sca.available_qty_mt), 0)::float AS ca_issued_qty_mt,
                (pol.ordered_qty_mt - COALESCE(SUM(sca.available_qty_mt), 0))::float AS remaining_unissued_qty_mt
            FROM purchase_order_lines pol
            JOIN purchase_orders po ON pol.po_number = po.po_number
            JOIN suppliers s ON po.supplier_id = s.id
            LEFT JOIN supplier_collection_advices sca ON sca.po_line_id = pol.id
            WHERE TRIM(pol.item_code) ILIKE $1 
              AND po.status NOT IN ('Completed', 'Cancelled')
            GROUP BY pol.id, po.po_number, po.po_date, s.name, pol.ordered_qty_mt
            HAVING (pol.ordered_qty_mt - COALESCE(SUM(sca.available_qty_mt), 0)) > 0
            ORDER BY po.po_date ASC;
        `;

        const [internalRes, externalRes, caRes, poRes] = await Promise.all([
            pool.query(onHandInternalQuery, [cleanItemCode]),
            pool.query(onHandExternalQuery, [cleanItemCode]),
            pool.query(incomingCaQuery, [cleanItemCode]),
            pool.query(incomingPoQuery, [cleanItemCode])
        ]);

        return res.status(200).json({
            success: true,
            item_code: cleanItemCode,
            on_hand_internal: internalRes.rows,
            on_hand_external: externalRes.rows,
            incoming_ca: caRes.rows,
            incoming_po: poRes.rows
        });

    } catch (err) {
        console.error('Failed to retrieve supply options:', err.stack);
        return res.status(500).json({ 
            success: false, 
            error: 'An internal server error occurred while retrieving supply options.' 
        });
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
            `SELECT sol.id AS so_line_id, sol.item_code, sol.ordered_qty_mt, so.status
             FROM sales_orders so
             JOIN sales_order_lines sol ON sol.so_number = so.so_number
             WHERE so.so_number = $1
             LIMIT 1
             FOR UPDATE OF so`,
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
                'SELECT item_code FROM huachang_collection_advice_lines WHERE hg_ca_number = $1',
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
             FROM sales_order_allocations WHERE so_line_id = $1 AND status != 'Cancelled'`,
            [salesOrder.so_line_id]
        );
        const soAlreadyAllocated = Number(soAllocatedResult.rows[0].total);

        if (soAlreadyAllocated + requestedQty > Number(salesOrder.ordered_qty_mt)) {
            const error = new Error(`Allocating ${requestedQty} MT would exceed sales order '${so_number}''s ordered quantity of ${salesOrder.ordered_qty_mt} MT (already allocated: ${soAlreadyAllocated} MT).`);
            error.statusCode = 400;
            throw error;
        }

        const insertResult = await client.query(
            `INSERT INTO sales_order_allocations (so_line_id, allocated_qty_mt, source_type, source_ref, status, created_by)
             VALUES ($1, $2, $3, $4, 'Soft', $5)
             RETURNING *`,
            [salesOrder.so_line_id, requestedQty, source_type, source_ref, req.user.id]
        );

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Allocation created successfully.',
            allocation: { ...insertResult.rows[0], so_number, item_code: itemCode }
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
        filters.push(`sol.so_number = $${params.length}`);
    }

    if (item_code) {
        params.push(item_code);
        filters.push(`sol.item_code = $${params.length}`);
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
                SELECT 1 FROM supplier_collection_advices sca
                JOIN purchase_order_lines pol ON sca.po_line_id = pol.id
                WHERE pol.po_number = a.source_ref
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
                a.id, a.so_line_id, sol.so_number, sol.item_code, i.description AS item_description,
                a.allocated_qty_mt::float AS allocated_qty_mt, a.source_type, a.source_ref, a.status,
                a.created_at, so.so_date, so.customer_id, c.name AS customer_name
            FROM sales_order_allocations a
            JOIN sales_order_lines sol ON sol.id = a.so_line_id
            JOIN sales_orders so ON so.so_number = sol.so_number
            JOIN customers c ON c.id = so.customer_id
            JOIN items i ON i.item_code = sol.item_code
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
