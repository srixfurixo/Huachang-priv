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
        pickup_location_id,
        item_code,
        quantity_mt,
        transporter_name,
        driver_name,
        lorry_number
    } = req.body;
    const created_by = req.user.id;

    if (
        !hg_ca_number ||
        supplier_ca_id === undefined ||
        !ca_date ||
        !destination_type ||
        pickup_location_id === undefined ||
        !item_code ||
        quantity_mt === undefined
    ) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: hg_ca_number, supplier_ca_id, ca_date, destination_type, pickup_location_id, item_code, and quantity_mt are required.'
        });
    }

    const requestedQty = Number(quantity_mt);
    if (isNaN(requestedQty) || requestedQty <= 0) {
        return res.status(400).json({
            success: false,
            error: 'quantity_mt must be a positive number greater than 0.'
        });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const supplierLotQuery = `
            SELECT available_qty_mt 
            FROM supplier_collection_advices 
            WHERE id = $1 
            FOR UPDATE
        `;
        const supplierLotResult = await client.query(supplierLotQuery, [supplier_ca_id]);

        if (supplierLotResult.rows.length === 0) {
            const error = new Error('Supplier lot allocation not found.');
            error.statusCode = 404;
            throw error;
        }

        const maxAvailableQty = Number(supplierLotResult.rows[0].available_qty_mt);

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

        const activeTrucksSumQuery = `
            SELECT COALESCE(SUM(quantity_mt), 0) AS total_dispatched_qty
            FROM huachang_collection_advices
            WHERE supplier_ca_id = $1 AND status != 'Cancelled'
        `;
        const activeTrucksSumResult = await client.query(activeTrucksSumQuery, [supplier_ca_id]);
        const totalDispatchedQty = Number(activeTrucksSumResult.rows[0].total_dispatched_qty);

        const projectedTotal = totalDispatchedQty + requestedQty;

        if (projectedTotal > maxAvailableQty) {
            const error = new Error(`Requested dispatch quantity exceeds the remaining balance authorized by the supplier. Available: ${maxAvailableQty - totalDispatchedQty} MT, Requested: ${requestedQty} MT.`);
            error.statusCode = 400;
            throw error;
        }

        const insertCaQuery = `
            INSERT INTO huachang_collection_advices (
                hg_ca_number,
                supplier_ca_id,
                ca_date,
                destination_type,
                destination_id,
                pickup_location_id,
                item_code,
                quantity_mt,
                transporter_name,
                driver_name,
                lorry_number,
                status,
                created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Dispatched', $12)
            RETURNING *;
        `;
        
        const insertValues = [
            hg_ca_number,
            supplier_ca_id,
            ca_date,
            destination_type,
            destination_id !== undefined ? destination_id : null,
            pickup_location_id,
            item_code,
            requestedQty,
            transporter_name || null,
            driver_name || null,
            lorry_number || null,
            created_by
        ];

        const insertResult = await client.query(insertCaQuery, insertValues);
        const newRecord = insertResult.rows[0];

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Huachang Collection Advice truck work order created successfully.',
            record: newRecord
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
                hca.item_code,
                COALESCE(i.description, hca.item_code) AS item_description,
                hca.quantity_mt::float AS quantity_mt,
                hca.transporter_name,
                hca.driver_name,
                hca.lorry_number,
                hca.status,
                sca.po_number,
                sca.supplier_ca_ref,
                COALESCE(l.name, 'N/A') AS pickup_location_name,
                hca.destination_type,
                hca.destination_id,
                u.username AS created_by
             FROM huachang_collection_advices hca
             LEFT JOIN items i ON i.item_code = hca.item_code
             LEFT JOIN supplier_collection_advices sca ON hca.supplier_ca_id = sca.id
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
             LEFT JOIN locations l ON l.id = b.location_id
             WHERE b.hg_ca_number = $1`,
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
