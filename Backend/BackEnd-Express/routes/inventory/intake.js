const express = require('express');
const router = express.Router();
const db = require('../../Static/db_main');

router.post('/intake', async (req, res) => {
    const {
        hg_ca_number,
        batch_code,
        item_code,
        location_id,
        quantity_mt,
        manufacture_date,
        expiry_date,
        remarks
    } = req.body;
    const performed_by = req.user.id;

    if (!hg_ca_number || !batch_code || !item_code || !location_id || quantity_mt === undefined) {
        return res.status(400).json({
            error: 'Missing required fields: hg_ca_number, batch_code, item_code, location_id, and quantity_mt are required.'
        });
    }

    if (Number(quantity_mt) <= 0) {
        return res.status(400).json({
            error: 'quantity_mt must be greater than 0.'
        });
    }

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const caQuery = `
            SELECT status, quantity_mt
            FROM huachang_collection_advices
            WHERE hg_ca_number = $1
            FOR UPDATE
        `;
        const caResult = await client.query(caQuery, [hg_ca_number]);

        if (caResult.rows.length === 0) {
            const error = new Error('Collection advice (truck) not found.');
            error.statusCode = 404;
            throw error;
        }

        const currentStatus = caResult.rows[0].status;
        const expectedQty = Number(caResult.rows[0].quantity_mt);

        if (currentStatus === 'Completed') {
            const error = new Error('Intake already logged for this truck (CA status is Completed).');
            error.statusCode = 400;
            throw error;
        }

        const requestedQty = Number(quantity_mt);

        let finalRemarks = remarks || null;
        const variancePct = expectedQty > 0 ? Math.abs(requestedQty - expectedQty) / expectedQty * 100 : 0;
        if (variancePct > 2) {
            const variancePrefix = `VARIANCE: expected ${expectedQty} MT, received ${requestedQty} MT. `;
            if (finalRemarks) {
                finalRemarks = variancePrefix + finalRemarks;
            } else {
                finalRemarks = variancePrefix.trim();
            }
        }

        const insertBatchQuery = `
            INSERT INTO inventory_batches (
                batch_code,
                item_code,
                hg_ca_number,
                location_id,
                current_qty,
                manufacture_date,
                expiry_date,
                status_confidence
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;
        const batchValues = [
            batch_code,
            item_code,
            hg_ca_number,
            location_id,
            quantity_mt,
            manufacture_date || null,
            expiry_date || null,
            'Pending'
        ];
        const batchResult = await client.query(insertBatchQuery, batchValues);
        const newBatch = batchResult.rows[0];

        const insertMovementQuery = `
            INSERT INTO inventory_movements (
                batch_code,
                location_id,
                movement_type,
                quantity_change,
                reference_doc,
                remarks,
                performed_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        const movementValues = [
            batch_code,
            location_id,
            'INTAKE',
            quantity_mt,
            hg_ca_number,
            finalRemarks,
            performed_by
        ];
        await client.query(insertMovementQuery, movementValues);

        const receivedSumQuery = `
            SELECT COALESCE(SUM(quantity_change), 0) AS total_received
            FROM inventory_movements
            WHERE reference_doc = $1 AND movement_type = 'INTAKE'
        `;
        const receivedSumResult = await client.query(receivedSumQuery, [hg_ca_number]);
        const totalReceived = Number(receivedSumResult.rows[0].total_received);

        const targetCaStatus = totalReceived >= expectedQty ? 'Completed' : 'Partially Received';

        const updateCaQuery = `
            UPDATE huachang_collection_advices
            SET status = $1
            WHERE hg_ca_number = $2
        `;
        await client.query(updateCaQuery, [targetCaStatus, hg_ca_number]);

        await client.query('COMMIT');

        return res.status(201).json({
            message: 'Intake processed successfully, pending supervisor verification.',
            batch: newBatch,
            ca_status: targetCaStatus
        });

    } catch (error) {
        await client.query('ROLLBACK');
        
        console.error('Error processing intake transaction:', error);

        const statusCode = error.statusCode || 500;
        const errorMessage = statusCode === 500 
            ? 'An internal server error occurred while processing the intake.' 
            : error.message;

        return res.status(statusCode).json({
            error: errorMessage
        });

    } finally {
        client.release();
    }
});

module.exports = router;