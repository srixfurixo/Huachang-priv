const pool = require('../Static/db_main');

async function getAvailability(itemCodes = null) {
    const params = [];
    let itemFilter = '';

    if (itemCodes) {
        params.push(itemCodes);
        itemFilter = `AND i.item_code = ANY($${params.length})`;
    }

    const query = `
        SELECT
            i.item_code,
            i.description,
            COALESCE(live.qty, 0) AS on_hand_mt,
            COALESCE(reported.qty, 0) AS reported_mt,
            COALESCE(inbound.qty, 0) AS inbound_mt,
            COALESCE(confirmed.qty, 0) AS committed_mt,
            COALESCE(soft.qty, 0) AS soft_committed_mt,
            (COALESCE(live.qty, 0) + COALESCE(inbound.qty, 0) - COALESCE(confirmed.qty, 0)) AS available_to_promise
        FROM items i
        LEFT JOIN (
            SELECT item_code, SUM(current_qty) AS qty
            FROM inventory_batches
            WHERE status_confidence = 'Live'
            GROUP BY item_code
        ) live ON live.item_code = i.item_code
        LEFT JOIN (
            SELECT item_code, SUM(current_qty) AS qty
            FROM inventory_batches
            WHERE status_confidence = 'Reported'
            GROUP BY item_code
        ) reported ON reported.item_code = i.item_code
        LEFT JOIN (
            SELECT hcal.item_code, SUM(hcal.quantity_mt) AS qty
            FROM huachang_collection_advice_lines hcal
            JOIN huachang_collection_advices hca ON hcal.hg_ca_number = hca.hg_ca_number
            WHERE hca.status NOT IN ('Completed', 'Cancelled')
            GROUP BY hcal.item_code
        ) inbound ON inbound.item_code = i.item_code
        LEFT JOIN (
            SELECT sol.item_code, SUM(soa.allocated_qty_mt) AS qty
            FROM sales_order_allocations soa
            JOIN sales_order_lines sol ON soa.so_line_id = sol.id
            WHERE soa.status = 'Confirmed'
            GROUP BY sol.item_code
        ) confirmed ON confirmed.item_code = i.item_code
        LEFT JOIN (
            SELECT sol.item_code, SUM(soa.allocated_qty_mt) AS qty
            FROM sales_order_allocations soa
            JOIN sales_order_lines sol ON soa.so_line_id = sol.id
            WHERE soa.status = 'Soft'
            GROUP BY sol.item_code
        ) soft ON soft.item_code = i.item_code
        WHERE i.is_active = true
        ${itemFilter}
        ORDER BY i.item_code;
    `;

    const { rows } = await pool.query(query, params);
    return rows;
}

module.exports = { getAvailability };
