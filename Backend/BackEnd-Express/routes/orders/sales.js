const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');

router.post('/sales', async (req, res) => {
    const { 
        so_number, 
        customer_id, 
        so_date, 
        customer_ref_no, 
        sales_agent, 
        ship_via, 
        remarks, 
        items 
    } = req.body;
    
    const created_by = req.user.id;

    if (!so_number || customer_id === undefined || !so_date || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: so_number, customer_id, so_date, and items array are required.'
        });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const dupCheck = await client.query('SELECT 1 FROM sales_orders WHERE so_number = $1', [so_number]);
        if (dupCheck.rows.length > 0) {
            const error = new Error('Sales Order number already exists.');
            error.statusCode = 400;
            throw error;
        }

        // 1. Insert Master Sales Order Header
        const insertSoQuery = `
            INSERT INTO sales_orders (
                so_number,
                customer_id,
                so_date,
                customer_ref_no,
                sales_agent,
                ship_via,
                remarks,
                status,
                created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending', $8)
            RETURNING *;
        `;
        const soValues = [
            so_number,
            customer_id,
            so_date,
            customer_ref_no || null,
            sales_agent || null,
            ship_via || null,
            remarks || null,
            created_by
        ];

        const soResult = await client.query(insertSoQuery, soValues);

        // 2. Insert Multi-Item Lines (No calculations, direct input assignment)
        const insertedLines = [];
        for (const line of items) {
            const requestedQty = Number(line.ordered_qty_mt);
            if (!line.item_code || isNaN(requestedQty) || requestedQty <= 0) {
                const error = new Error(`Invalid item_code or quantity for item: ${line.item_code}`);
                error.statusCode = 400;
                throw error;
            }

            const insertLineQuery = `
                INSERT INTO sales_order_lines (
                    so_number,
                    item_code,
                    ordered_qty_mt,
                    estimated_delivery_date,
                    packaging_kg,
                    no_of_bags,
                    status
                ) VALUES ($1, $2, $3, $4, $5, $6, 'Pending')
                RETURNING *;
            `;
            const lineValues = [
                so_number,
                line.item_code,
                requestedQty,
                line.estimated_delivery_date || null,
                line.packaging_kg || null,
                line.no_of_bags || 0 // Default to 0 if not provided
            ];

            const lineResult = await client.query(insertLineQuery, lineValues);
            insertedLines.push(lineResult.rows[0]);
        }

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Sales Order created successfully.',
            sales_order: soResult.rows[0],
            line_items: insertedLines
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Transaction failed for Sales Order creation:', error);

        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                error: 'Database constraint violation: The referenced customer, item, or user does not exist.'
            });
        }

        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            error: error.message || 'An internal server error occurred.'
        });
    } finally {
        client.release();
    }
});

module.exports = router;