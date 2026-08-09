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
            SELECT item_code, SUM(quantity_mt) AS qty
            FROM huachang_collection_advices
            WHERE status NOT IN ('Completed', 'Cancelled')
            GROUP BY item_code
        ) inbound ON inbound.item_code = i.item_code
        LEFT JOIN (
            SELECT item_code, SUM(allocated_qty_mt) AS qty
            FROM sales_order_allocations
            WHERE status = 'Confirmed'
            GROUP BY item_code
        ) confirmed ON confirmed.item_code = i.item_code
        LEFT JOIN (
            SELECT item_code, SUM(allocated_qty_mt) AS qty
            FROM sales_order_allocations
            WHERE status = 'Soft'
            GROUP BY item_code
        ) soft ON soft.item_code = i.item_code
        WHERE i.is_active = true
        ${itemFilter}
        ORDER BY i.item_code;
    `;

    const { rows } = await pool.query(query, params);
    return rows;
}

module.exports = { getAvailability };
