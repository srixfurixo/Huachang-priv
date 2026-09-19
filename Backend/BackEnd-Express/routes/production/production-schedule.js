const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');

router.get('/schedule/calendar', async (req, res) => {
    let { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
        
        start_date = `${year}-${month}-01`;
        end_date = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    }

    const query = `
        SELECT 
            po.id AS production_order_id,
            po.production_order_code,
            po.item_code,
            i.description AS item_description,
            po.handling_type,
            po.target_qty_mt::float AS target_qty_mt,
            po.target_packaging,
            po.target_unit_count,
            po.scheduled_start_date,
            po.scheduled_end_date,
            po.scheduled_shift,
            po.status,
            c.name AS customer_name,
            c.debtor_code,
            (
                SELECT COALESCE(SUM(ppl.tonnage_processed), 0)::float
                FROM production_progress_logs ppl
                WHERE ppl.production_order_id = po.id
            ) AS processed_qty_mt,
            (
                SELECT COALESCE(
                    json_agg(
                        json_build_object(
                            'worker_id', u.id,
                            'worker_name', u.first_name || ' ' || u.last_name,
                            'role', pa.role_in_production
                        )
                    ), '[]'::json
                )
                FROM production_assignments pa
                JOIN users u ON pa.worker_id = u.id
                WHERE pa.production_order_id = po.id
            ) AS assigned_workers
        FROM production_orders po
        JOIN items i ON po.item_code = i.item_code
        JOIN sales_order_lines sol ON po.so_line_id = sol.id
        JOIN sales_orders so ON sol.so_number = so.so_number
        JOIN customers c ON so.customer_id = c.id
        WHERE po.status != 'Cancelled'
          AND po.scheduled_start_date <= $2::date
          AND (po.scheduled_end_date IS NULL OR po.scheduled_end_date >= $1::date)
        ORDER BY po.scheduled_start_date ASC, po.scheduled_shift ASC;
    `;

    try {
        const { rows } = await pool.query(query, [start_date, end_date]);

        const shift_totals = {};

        rows.forEach(item => {
            const dateKey = typeof item.scheduled_start_date === 'string'
                ? item.scheduled_start_date.substring(0, 10)
                : item.scheduled_start_date.toISOString().substring(0, 10);

            const shift = item.scheduled_shift || 'Morning';

            if (!shift_totals[dateKey]) {
                shift_totals[dateKey] = {
                    Morning: { total_orders: 0, total_tonnage_mt: 0 },
                    Afternoon: { total_orders: 0, total_tonnage_mt: 0 }
                };
            }

            if (!shift_totals[dateKey][shift]) {
                shift_totals[dateKey][shift] = { total_orders: 0, total_tonnage_mt: 0 };
            }

            shift_totals[dateKey][shift].total_orders += 1;
            shift_totals[dateKey][shift].total_tonnage_mt += item.target_qty_mt;
        });

        return res.status(200).json({
            success: true,
            date_range: { start_date, end_date },
            events: rows,
            shift_totals
        });

    } catch (error) {
        console.error('Failed to retrieve calendar schedule:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve calendar schedule.'
        });
    }
});

module.exports = router;