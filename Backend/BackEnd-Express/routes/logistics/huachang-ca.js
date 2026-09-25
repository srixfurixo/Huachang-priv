const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');

router.post('/huachang-ca', async (req, res) => {
    const {
        hg_ca_number,
        supplier_ca_id,
        ca_date,
        destination_type,
        destination_id,
        destination_customer_id,
        pickup_location_id,
        item_code,
        quantity_mt,
        transporter_name,
        driver_name,
        lorry_number,
        items
    } = req.body;
    let created_by = 1;
    if (req.user && req.user.id) {
        created_by = req.user.id;
    }

    let lineItems = [];
    if (Array.isArray(items) && items.length > 0) {
        lineItems = items;
    } else {
        if (supplier_ca_id !== undefined && item_code && quantity_mt !== undefined) {
            lineItems = [
                {
                    supplier_ca_id: supplier_ca_id,
                    item_code: item_code,
                    quantity_mt: quantity_mt
                }
            ];
        }
    }

    if (
        !hg_ca_number ||
        !ca_date ||
        !destination_type ||
        pickup_location_id === undefined ||
        lineItems.length === 0
    ) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: hg_ca_number, ca_date, destination_type, pickup_location_id, and line items are required.'
        });
    }

    for (let i = 0; i < lineItems.length; i++) {
        const line = lineItems[i];
        const lineQty = Number(line.quantity_mt);
        if (line.supplier_ca_id === undefined || !line.item_code || isNaN(lineQty) || lineQty <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Each item must have a valid supplier_ca_id, item_code, and a positive quantity_mt.'
            });
        }
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const duplicateCheckQuery = `
            SELECT 1 
            FROM huachang_collection_advices 
            WHERE hg_ca_number = $1
        `;
        const duplicateCheckResult = await client.query(duplicateCheckQuery, [hg_ca_number]);

        if (duplicateCheckResult.rows.length > 0) {
            const error = new Error('Huachang CA number already exists.');
            error.statusCode = 400;
            throw error;
        }

        const supplierLotQuery = `
            SELECT available_qty_mt 
            FROM supplier_collection_advices 
            WHERE id = $1 
            FOR UPDATE
        `;

        const activeTrucksSumQuery = `
            SELECT COALESCE(SUM(hcal.quantity_mt), 0) AS total_dispatched_qty
            FROM huachang_collection_advice_lines hcal
            JOIN huachang_collection_advices hca ON hcal.hg_ca_number = hca.hg_ca_number
            WHERE hcal.supplier_ca_id = $1 AND hca.status != 'Cancelled'
        `;

        for (let i = 0; i < lineItems.length; i++) {
            const line = lineItems[i];
            const lineQty = Number(line.quantity_mt);

            const supplierLotResult = await client.query(supplierLotQuery, [line.supplier_ca_id]);

            if (supplierLotResult.rows.length === 0) {
                const error = new Error(`Supplier lot allocation not found for ID: ${line.supplier_ca_id}`);
                error.statusCode = 404;
                throw error;
            }

            const maxAvailableQty = Number(supplierLotResult.rows[0].available_qty_mt);

            const activeTrucksSumResult = await client.query(activeTrucksSumQuery, [line.supplier_ca_id]);
            const totalDispatchedQty = Number(activeTrucksSumResult.rows[0].total_dispatched_qty);

            const projectedTotal = totalDispatchedQty + lineQty;

            if (projectedTotal > maxAvailableQty) {
                const error = new Error(`Requested dispatch quantity exceeds the remaining balance authorized by the supplier. Available: ${maxAvailableQty - totalDispatchedQty} MT, Requested: ${lineQty} MT.`);
                error.statusCode = 400;
                throw error;
            }
        }

        let resolvedDestinationId = null;
        if (destination_customer_id !== undefined && destination_customer_id !== null) {
            resolvedDestinationId = destination_customer_id;
        } else {
            if (destination_id !== undefined && destination_id !== null) {
                resolvedDestinationId = destination_id;
            }
        }

        const insertCaQuery = `
            INSERT INTO huachang_collection_advices (
                hg_ca_number,
                ca_date,
                destination_type,
                destination_id,
                pickup_location_id,
                transporter_name,
                driver_name,
                lorry_number,
                status,
                created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Dispatched', $9)
            RETURNING *;
        `;
        
        const insertValues = [
            hg_ca_number,
            ca_date,
            destination_type,
            resolvedDestinationId,
            pickup_location_id,
            transporter_name || null,
            driver_name || null,
            lorry_number || null,
            created_by
        ];

        const insertResult = await client.query(insertCaQuery, insertValues);

        const insertLineQuery = `
            INSERT INTO huachang_collection_advice_lines (
                hg_ca_number,
                supplier_ca_id,
                item_code,
                quantity_mt
            ) VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;

        const insertedLines = [];
        for (let i = 0; i < lineItems.length; i++) {
            const line = lineItems[i];
            const lineResult = await client.query(insertLineQuery, [
                hg_ca_number,
                line.supplier_ca_id,
                line.item_code,
                Number(line.quantity_mt)
            ]);
            insertedLines.push(lineResult.rows[0]);
        }

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Huachang Collection Advice truck work order created successfully.',
            record: insertResult.rows[0],
            lines: insertedLines
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Transaction failed for Huachang CA creation:', error);

        const statusCode = error.statusCode || 500;
        const errorMessage = statusCode === 500
            ? 'An internal server error occurred while processing the Huachang Collection Advice.'
            : error.message;

        return res.status(statusCode).json({
            success: false,
            error: errorMessage
        });
    } finally {
        client.release();
    }
});

router.get('/huachang-ca/:hg_ca_number', async (req, res) => {
    const { hg_ca_number } = req.params;
    try {
        const caResult = await pool.query(
            `SELECT 
                hca.hg_ca_number,
                hca.ca_date,
                hcal.item_code,
                COALESCE(i.description, hcal.item_code) AS item_description,
                hcal.quantity_mt::float AS quantity_mt,
                hca.transporter_name,
                hca.driver_name,
                hca.lorry_number,
                hca.status,
                pol.po_number,
                sca.supplier_ca_ref,
                COALESCE(l.name, 'N/A') AS pickup_location_name,
                hca.destination_type,
                hca.destination_id,
                u.username AS created_by
             FROM huachang_collection_advices hca
             LEFT JOIN huachang_collection_advice_lines hcal ON hcal.hg_ca_number = hca.hg_ca_number
             LEFT JOIN items i ON i.item_code = hcal.item_code
             LEFT JOIN supplier_collection_advices sca ON hcal.supplier_ca_id = sca.id
             LEFT JOIN purchase_order_lines pol ON pol.id = sca.po_line_id
             LEFT JOIN locations l ON hca.pickup_location_id = l.id
             LEFT JOIN users u ON u.id = hca.created_by
             WHERE hca.hg_ca_number = $1`,
            [hg_ca_number]
        );

        if (caResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: `Collection advice '${hg_ca_number}' not found.` 
            });
        }

        const batchesResult = await pool.query(
            `SELECT 
                b.batch_code, 
                b.item_code, 
                b.current_qty::float AS current_qty, 
                b.status_confidence, 
                COALESCE(l.name, 'N/A') AS location
             FROM inventory_batches b
             LEFT JOIN huachang_collection_advice_lines hcal ON b.hg_ca_line_id = hcal.id
             LEFT JOIN locations l ON l.id = b.location_id
             WHERE hcal.hg_ca_number = $1`,
            [hg_ca_number]
        );

        return res.json({
            success: true,
            collection_advice: caResult.rows[0],
            received_batches: batchesResult.rows
        });
    } catch (err) {
        console.error('Collection advice detail error:', err.stack);
        return res.status(500).json({ success: false, error: 'Failed to load collection advice' });
    }
});

module.exports = router;
