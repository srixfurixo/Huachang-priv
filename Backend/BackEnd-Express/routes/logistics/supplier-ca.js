const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');

router.post('/supplier-ca', async (req, res) => {
    const { po_number, supplier_ca_ref, ca_date, available_qty_mt } = req.body;

    if (!po_number || !supplier_ca_ref || !ca_date || available_qty_mt === undefined) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: po_number, supplier_ca_ref, ca_date, and available_qty_mt are all required.'
        });
    }

    const requestedQty = Number(available_qty_mt);
    if (isNaN(requestedQty) || requestedQty <= 0) {
        return res.status(400).json({
            success: false,
            error: 'available_qty_mt must be a positive number greater than 0.'
        });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const poQuery = `
            SELECT ordered_qty_mt, status 
            FROM purchase_orders 
            WHERE po_number = $1 
            FOR UPDATE
        `;
        const poResult = await client.query(poQuery, [po_number]);

        if (poResult.rows.length === 0) {
            const error = new Error('Purchase Order not found.');
            error.statusCode = 404;
            throw error;
        }

        const orderedQty = Number(poResult.rows[0].ordered_qty_mt);

        const dupCheckQuery = `
            SELECT 1 
            FROM supplier_collection_advices 
            WHERE po_number = $1 AND supplier_ca_ref = $2
        `;
        const dupCheckResult = await client.query(dupCheckQuery, [po_number, supplier_ca_ref]);

        if (dupCheckResult.rows.length > 0) {
            const error = new Error(`Supplier Collection Advice with reference '${supplier_ca_ref}' has already been logged for this Purchase Order.`);
            error.statusCode = 400;
            throw error;
        }

        const sumQuery = `
            SELECT COALESCE(SUM(available_qty_mt), 0) AS total_existing_qty 
            FROM supplier_collection_advices 
            WHERE po_number = $1
        `;
        const sumResult = await client.query(sumQuery, [po_number]);
        const existingQty = Number(sumResult.rows[0].total_existing_qty);
        
        const projectedTotalQty = existingQty + requestedQty;

        let targetPoStatus;
        if (projectedTotalQty === orderedQty) {
            targetPoStatus = 'Fully Collected';
        } else if (projectedTotalQty > orderedQty) {
            targetPoStatus = 'Overdrawn';
        } else {
            targetPoStatus = 'Partial';
        }

        const insertCaQuery = `
            INSERT INTO supplier_collection_advices (
                po_number, 
                supplier_ca_ref, 
                ca_date, 
                available_qty_mt
            ) VALUES ($1, $2, $3, $4) 
            RETURNING id, po_number, supplier_ca_ref, ca_date, available_qty_mt
        `;
        const insertCaResult = await client.query(insertCaQuery, [
            po_number,
            supplier_ca_ref,
            ca_date,
            requestedQty
        ]);
        const newCaRecord = insertCaResult.rows[0];

        const updatePoQuery = `
            UPDATE purchase_orders 
            SET status = $1 
            WHERE po_number = $2
        `;
        await client.query(updatePoQuery, [targetPoStatus, po_number]);

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Supplier Collection Advice logged successfully.',
            po_status_updated_to: targetPoStatus,
            collection_advice: newCaRecord
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Transaction failed for supplier-ca logging:', error);

        const statusCode = error.statusCode || 500;
        const errorMessage = statusCode === 500
            ? 'An internal server error occurred while processing the Supplier Collection Advice.'
            : error.message;

        return res.status(statusCode).json({
            success: false,
            error: errorMessage
        });
    } finally {
        client.release();
    }
});

router.get('/supplier-ca/active', async (req, res) => {
    const query = `
        SELECT 
            sca.id,
            sca.po_number,
            sca.supplier_ca_ref,
            sca.ca_date,
            sca.available_qty_mt,
            COALESCE(SUM(hca.quantity_mt), 0) AS total_truck_dispatched_mt,
            (sca.available_qty_mt - COALESCE(SUM(hca.quantity_mt), 0)) AS remaining_ca_balance_mt
        FROM supplier_collection_advices sca
        LEFT JOIN huachang_collection_advices hca 
            ON sca.id = hca.supplier_ca_id AND hca.status != 'Cancelled'
        GROUP BY 
            sca.id,
            sca.po_number,
            sca.supplier_ca_ref,
            sca.ca_date,
            sca.available_qty_mt
        HAVING (sca.available_qty_mt - COALESCE(SUM(hca.quantity_mt), 0)) > 0
        ORDER BY sca.ca_date DESC;
    `;

    try {
        const { rows } = await pool.query(query);
        return res.status(200).json({
            success: true,
            active_supplier_cas: rows
        });
    } catch (error) {
        console.error('Failed to retrieve active supplier CAs:', error);
        return res.status(500).json({
            success: false,
            error: 'An internal server error occurred while retrieving active supplier allocations.'
        });
    }
});

module.exports = router;
