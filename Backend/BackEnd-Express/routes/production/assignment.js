const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');

router.get('/workers/available', async (req, res) => {
    const {slot_date, shift_name, production_order_id} = req.query;

    const query = `
        SELECT 
            u.id AS worker_id,
            u.staff_id,
            u.first_name,
            u.last_name,
            u.username,
            u.email
        FROM users u
        WHERE u.is_active = true
        ORDER BY u.first_name ASC, u.last_name ASC;
    `;

    try{
        const {rows} = await pool.query(query);

        return res.status(200).json({
            success:true,
            data:rows
        });
    } catch (err){
        console.error('Error fetching available workers: ', err);
        return res.status(500).json({success:false, error:'INTERNAL_SERVER_ERROR'});
    }
});

router.post('/orders/:id/assign-workers', async (req, res) => {
    const productionOrderId = parseInt(req.params.id, 10);
    let {slot_date, shift_name, assignments, assigned_by} = req.body;

    if(isNaN(productionOrderId)) {
        return res.status(400).json({success:false, error:'INVALID_ORDER_ID'});    
    }
    
    if(!Array.isArray(assignments) || assignments.length === 0){
        return res.status(400).json({
            success:false,
            error:'MISSING_REQUIRED_FIELDS: assignments array is required.'
        });
    }

    const client = await pool.connect();
    try{
        await client.query('BEGIN');

        const orderCheck = await client.query(
            `SELECT id, scheduled_start_date, scheduled_shift FROM production_orders WHERE id = $1`,
            [productionOrderId]
        );

        if (orderCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({success: false, error: 'ORDER_NOT_FOUND'});
        }

        const order = orderCheck.rows[0];
        slot_date = slot_date || order.scheduled_start_date;
        shift_name = shift_name || order.scheduled_shift || 'Morning';
        assigned_by = assigned_by || req.user?.id || null;

        if (!slot_date) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: 'MISSING_REQUIRED_FIELDS: slot_date is required.'
            });
        }

        const insertedAssignments = [];

        for(const item of assignments) {
            const {worker_id} = item;

            if (!worker_id){
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    error: 'INVALID_ASSIGNMENT_ITEM: worker_id is required.'
                });
            }

            const insertQuery = `
                INSERT INTO production_assignments(
                    production_order_id,
                    worker_id,
                    slot_date,
                    shift_name,
                    assigned_by
                ) VALUES ($1, $2, $3, $4, $5)
                RETURNING 
                    id AS assignment_id,
                    production_order_id,
                    worker_id,
                    slot_date,
                    shift_name,
                    assigned_at;
            `;

             const insertRes =await client.query(insertQuery, [
                productionOrderId,
                worker_id,
                slot_date,
                shift_name,
                assigned_by || null
             ]);

             insertedAssignments.push(insertRes.rows[0]);
        }

        await client.query('COMMIT');
        return res.status(201).json({
            success: true,
            message:'workers successfully assigned to production slot',
            data: insertedAssignments
        });
    } catch (err){
        await client.query('ROLLBACK');

        console.error('Error assigning workers:', err);
        return res.status(500).json({success: false, error:'INTERNAL_SERVER_ERROR'});
    } finally {
        client.release();
    }
});

router.delete('/orders/:id/assignments/:assignment_id', async (req, res) => {
    const productionOrderId = parseInt(req.params.id, 10);
    const assignmentId = parseInt(req.params.assignment_id, 10);

    if(isNaN(productionOrderId) || isNaN(assignmentId)) {
        return res.status(400).json({success: false, error: 'INVALID_PARAMETERS'});
    }

    try {
        const deleteQuery = `
        DELETE FROM production_assignments
        WHERE id = $1 AND production_order_id = $2
        RETURNING id AS assignment_id, worker_id, slot_date, shift_name, role_in_production;
        `;

        const {rows} = await pool.query(deleteQuery, [assignmentId, productionOrderId]);

        if (rows.length === 0){
            return res.status(404).json({
                success:false,
                error: 'ASSIGNMENT_NOT_FOUND'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Worker successfully unassigned',
            data: rows[0]
        });
    } catch (err) {
        console.error('Error unassigning worker:', err);
        return res.status(500).json({success:false, error:'INTERNAL_SERVER_ERROR'});
    }
});

module.exports = router;