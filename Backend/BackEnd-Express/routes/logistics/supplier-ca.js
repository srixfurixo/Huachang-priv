const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');

// Endpoint to log a Supplier Collection Advice against a specific PO line
router.post('/supplier-ca', async (req, res) => {
    // Extract input fields from request body
    const { po_line_id, supplier_ca_ref, ca_date, available_qty_mt } = req.body;

    // Validate that all required parameters are provided
    if (!po_line_id || !supplier_ca_ref || !ca_date || available_qty_mt === undefined) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: po_line_id, supplier_ca_ref, ca_date, and available_qty_mt are required.'
        });
    }

    // Validate that available release quantity is positive numeric
    const requestedQty = Number(available_qty_mt);
    if (isNaN(requestedQty) || requestedQty <= 0) {
        return res.status(400).json({
            success: false,
            error: 'available_qty_mt must be a positive number greater than 0.'
        });
    }

    const client = await pool.connect();

    try {
        // Begin transaction
        await client.query('BEGIN');

        // Query and lock the target PO line record
        const poLineQuery = `
            SELECT id, po_number, item_code, ordered_qty_mt, status
            FROM purchase_order_lines
            WHERE id = $1
            FOR UPDATE
        `;
        const poLineResult = await client.query(poLineQuery, [po_line_id]);

        // Verify that the purchase order line exists
        if (poLineResult.rows.length === 0) {
            const error = new Error('Purchase Order line not found.');
            error.statusCode = 404;
            throw error;
        }

        const lineRecord = poLineResult.rows[0];
        const lineOrderedQty = Number(lineRecord.ordered_qty_mt);
        const parentPoNumber = lineRecord.po_number;

        // Check for duplicate supplier CA reference on the same PO line
        const dupCheckQuery = `
            SELECT 1
            FROM supplier_collection_advices
            WHERE po_line_id = $1 AND supplier_ca_ref = $2
        `;
        const dupCheckResult = await client.query(dupCheckQuery, [po_line_id, supplier_ca_ref]);

        if (dupCheckResult.rows.length > 0) {
            const error = new Error(`Supplier Collection Advice with reference '${supplier_ca_ref}' has already been logged for this Purchase Order line.`);
            error.statusCode = 400;
            throw error;
        }

        // Sum existing released quantities for this PO line
        const sumQuery = `
            SELECT COALESCE(SUM(available_qty_mt), 0) AS total_existing_qty
            FROM supplier_collection_advices
            WHERE po_line_id = $1
        `;
        const sumResult = await client.query(sumQuery, [po_line_id]);
        const existingReleased = Number(sumResult.rows[0].total_existing_qty);

        // Enforce that release does not exceed remaining unreleased balance on the line
        const projectedTotal = existingReleased + requestedQty;

        if (projectedTotal > lineOrderedQty) {
            const remainingBalance = lineOrderedQty - existingReleased;
            const error = new Error(`Requested release quantity (${requestedQty} MT) exceeds the remaining unreleased balance (${remainingBalance} MT) on this PO line.`);
            error.statusCode = 400;
            throw error;
        }

        // Insert new supplier collection advice record linked to po_line_id
        const insertCaQuery = `
            INSERT INTO supplier_collection_advices (
                po_line_id,
                supplier_ca_ref,
                ca_date,
                available_qty_mt
            ) VALUES ($1, $2, $3, $4)
            RETURNING id, po_line_id, supplier_ca_ref, ca_date, available_qty_mt, created_at
        `;
        const insertCaResult = await client.query(insertCaQuery, [
            po_line_id,
            supplier_ca_ref,
            ca_date,
            requestedQty
        ]);
        const newCaRecord = insertCaResult.rows[0];

        // Determine updated status for the purchase order line
        let targetLineStatus = 'Partial';
        if (projectedTotal === lineOrderedQty) {
            targetLineStatus = 'Completed';
        } else {
            targetLineStatus = 'Partial';
        }

        // Update status of the purchase order line
        const updateLineQuery = `
            UPDATE purchase_order_lines
            SET status = $1
            WHERE id = $2
        `;
        await client.query(updateLineQuery, [targetLineStatus, po_line_id]);

        // Sync parent purchase order status based on all its child lines
        const checkAllLinesQuery = `
            SELECT status FROM purchase_order_lines WHERE po_number = $1
        `;
        const allLinesResult = await client.query(checkAllLinesQuery, [parentPoNumber]);
        let allCompleted = true;
        for (let i = 0; i < allLinesResult.rows.length; i++) {
            if (allLinesResult.rows[i].status !== 'Completed') {
                allCompleted = false;
            }
        }
        let parentStatus = 'Partial';
        if (allCompleted) {
            parentStatus = 'Fully Collected';
        }
        const updatePoQuery = `
            UPDATE purchase_orders
            SET status = $1
            WHERE po_number = $2
        `;
        await client.query(updatePoQuery, [parentStatus, parentPoNumber]);

        // Commit transaction
        await client.query('COMMIT');

        // Return HTTP 201 response with created record
        return res.status(201).json({
            success: true,
            message: 'Supplier Collection Advice logged successfully.',
            line_status_updated_to: targetLineStatus,
            collection_advice: newCaRecord
        });

    } catch (error) {
        // Rollback transaction on failure
        await client.query('ROLLBACK');
        console.error('Transaction failed for supplier-ca logging:', error);

        let statusCode = 500;
        if (error.statusCode) {
            statusCode = error.statusCode;
        }

        let errorMessage = error.message;
        if (statusCode === 500) {
            errorMessage = 'An internal server error occurred while processing the Supplier Collection Advice.';
        }

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
            pol.po_number,
            sca.supplier_ca_ref,
            sca.ca_date,
            sca.available_qty_mt,
            COALESCE(SUM(hcal.quantity_mt), 0) AS total_truck_dispatched_mt,
            (sca.available_qty_mt - COALESCE(SUM(hcal.quantity_mt), 0)) AS remaining_ca_balance_mt
        FROM supplier_collection_advices sca
        LEFT JOIN purchase_order_lines pol 
            ON sca.po_line_id = pol.id
        LEFT JOIN (
            huachang_collection_advice_lines hcal
            JOIN huachang_collection_advices hca 
                ON hcal.hg_ca_number = hca.hg_ca_number AND hca.status != 'Cancelled'
        ) ON sca.id = hcal.supplier_ca_id
        GROUP BY 
            sca.id,
            pol.po_number,
            sca.supplier_ca_ref,
            sca.ca_date,
            sca.available_qty_mt
        HAVING (sca.available_qty_mt - COALESCE(SUM(hcal.quantity_mt), 0)) > 0
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
